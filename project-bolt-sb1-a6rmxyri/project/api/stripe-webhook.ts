import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createHash } from 'crypto'
import { supabaseAdmin } from './_supabaseAdmin.js'

// SHA256ハッシュ関数（Meta Conversions API用）
function hashSHA256(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

// Meta Conversions API へ購入イベントを送信
async function sendMetaConversion(eventData: {
  userId: string
  planId: string
  amount: number
  email?: string | null
  eventId?: string
}): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    console.log('[Meta Conversions API] Skipped: Missing META_PIXEL_ID or META_ACCESS_TOKEN')
    return
  }

  const eventTime = Math.floor(Date.now() / 1000)

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${pixelId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: eventTime,
          event_id: eventData.eventId, // クライアント側と同じevent_idで重複排除
          action_source: 'website',
          user_data: {
            em: eventData.email ? hashSHA256(eventData.email) : undefined,
            external_id: hashSHA256(eventData.userId),
          },
          custom_data: {
            currency: 'JPY',
            value: eventData.amount,
            content_name: eventData.planId,
            content_type: 'product',
            content_ids: [eventData.planId],
          }
        }],
        access_token: accessToken
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Meta Conversions API] Error:', response.status, errorText)
    } else {
      const result = await response.json()
      console.log('[Meta Conversions API] Success:', result)
    }
  } catch (error) {
    console.error('[Meta Conversions API] Failed to send:', error)
  }
}

export const config = {
  api: {
    bodyParser: false
  }
}

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
if (!stripeSecret) throw new Error('Missing STRIPE_SECRET_KEY')
if (!webhookSecret) throw new Error('Missing STRIPE_WEBHOOK_SECRET')

const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature'] as string
  const buf = await readRawBody(req)
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = session.subscription as string | undefined
        const customerId = session.customer as string | undefined
        const userId = session.metadata?.user_id
        const billing = session.metadata?.billing || 'monthly'
        const rawPlanId = session.metadata?.plan_id || null
        const planId = rawPlanId === 'enterprise' ? 'business' : rawPlanId

        if (userId && customerId) {
          console.log('checkout.session.completed payload', {
            userId,
            customerId,
            subscriptionId,
            planId,
            billing
          })
          // Stripe側の期間情報を取得（fallbackで+30日）
          let periodStart = new Date()
          let periodEnd = new Date()
          periodEnd.setDate(periodEnd.getDate() + 30)
          let cancelAtPeriodEnd = false
          let status: 'active' | 'trial' = 'active'

          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId)
              periodStart = new Date((sub.current_period_start || Math.floor(Date.now() / 1000)) * 1000)
              periodEnd = new Date((sub.current_period_end || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60) * 1000)
              cancelAtPeriodEnd = sub.cancel_at_period_end ?? false
              status = sub.status === 'trialing' ? 'trial' : 'active'
            } catch (err) {
              console.error('Failed to retrieve subscription details', err)
            }
          }

          const { error: upsertError } = await supabaseAdmin.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: planId && ['standard', 'pro', 'business'].includes(planId) ? planId : 'standard',
            status,
            monthly_download_limit: planId === 'business' ? 50 : planId === 'pro' ? 30 : 15,
            current_period_start: periodStart.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: cancelAtPeriodEnd
          }, { onConflict: 'user_id' })
          if (upsertError) {
            console.error('supabase subscriptions upsert error', upsertError)
            throw upsertError
          }
          console.log('subscriptions upsert success', { userId, customerId, subscriptionId })

          // Meta Conversions API へ購入イベント送信（サーバーサイド）
          const planPrices: Record<string, number> = {
            standard: 1980,
            pro: 3980,
            business: 9800
          }
          await sendMetaConversion({
            userId,
            planId: planId || 'standard',
            amount: session.amount_total || planPrices[planId || 'standard'] || 0,
            email: session.customer_details?.email,
            eventId: session.id // checkout.session IDを使用して重複排除
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (customerId) {
          // user_id を逆引き（最初に作成した行の user_id を使用）
          const { data } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()

          const statusMap: Record<string, 'active' | 'canceled' | 'past_due' | 'unpaid'> = {
            active: 'active',
            trialing: 'active',
            canceled: 'canceled',
            past_due: 'past_due',
            unpaid: 'unpaid',
            incomplete: 'past_due',
            incomplete_expired: 'canceled'
          }

          // プラン情報をSubscriptionのitemsから取得
          let planId: string | null = null

          // デバッグ: subscription items の詳細をログ
          const firstItem = sub.items?.data?.[0]
          const priceAmount = firstItem?.price?.unit_amount || (firstItem as any)?.plan?.amount
          console.log('subscription items debug', {
            hasItems: !!sub.items?.data?.length,
            itemsCount: sub.items?.data?.length || 0,
            priceAmount,
            firstItem: firstItem ? {
              priceId: firstItem?.price?.id,
              productId: firstItem?.price?.product,
              priceMetadata: firstItem?.price?.metadata,
              priceLookupKey: firstItem?.price?.lookup_key,
              priceNickname: firstItem?.price?.nickname,
              unitAmount: firstItem?.price?.unit_amount,
              planAmount: (firstItem as any)?.plan?.amount,
              recurringInterval: firstItem?.price?.recurring?.interval
            } : null
          })

          if (sub.items?.data?.length > 0) {
            const priceId = firstItem?.price?.id
            const productId = firstItem?.price?.product
            const productIdStr = typeof productId === 'string' ? productId : productId?.id
            const priceLookupKey = firstItem?.price?.lookup_key
            const priceNickname = firstItem?.price?.nickname

            // price_id または product metadata からプランを判定
            // Stripe Dashboard で設定した metadata.plan_id を優先
            const priceMetadata = firstItem?.price?.metadata
            if (priceMetadata?.plan_id) {
              planId = priceMetadata.plan_id
              console.log('planId from price metadata:', planId)
            } else if (priceId) {
              // 環境変数のprice_idから逆引き
              const priceStandard = process.env.VITE_PRICE_STANDARD_MONTHLY || process.env.VITE_PRICE_STANDARD_YEARLY
              const pricePro = process.env.VITE_PRICE_PRO_MONTHLY || process.env.VITE_PRICE_PRO_YEARLY
              const priceBusiness = process.env.VITE_PRICE_BUSINESS_MONTHLY || process.env.VITE_PRICE_BUSINESS_YEARLY || process.env.VITE_PRICE_ENTERPRISE_MONTHLY || process.env.VITE_PRICE_ENTERPRISE_YEARLY

              console.log('price id matching debug', {
                priceId,
                priceStandard,
                pricePro,
                priceBusiness,
                priceLookupKey,
                priceNickname
              })

              // lookup_key や nickname からも判定を試みる
              const lookupOrNickname = (priceLookupKey || priceNickname || '').toLowerCase()

              if (priceId.includes('Standard') || priceId === priceStandard || lookupOrNickname.includes('standard')) {
                planId = 'standard'
              } else if (priceId.includes('Pro') || priceId === pricePro || lookupOrNickname.includes('pro')) {
                planId = 'pro'
              } else if (priceId.includes('Business') || priceId.includes('Enterprise') || priceId === priceBusiness || lookupOrNickname.includes('business') || lookupOrNickname.includes('enterprise')) {
                planId = 'business'
              }

              if (planId) {
                console.log('planId from priceId/lookupKey matching:', planId)
              }
            }

            // product を取得してmetadataを確認
            if (!planId && productIdStr) {
              try {
                const product = await stripe.products.retrieve(productIdStr)
                console.log('product retrieved', {
                  productId: productIdStr,
                  productName: product.name,
                  productMetadata: product.metadata
                })
                if (product.metadata?.plan_id) {
                  planId = product.metadata.plan_id
                  console.log('planId from product metadata:', planId)
                } else if (product.name) {
                  const nameLower = product.name.toLowerCase()
                  if (nameLower.includes('standard') || nameLower.includes('スタンダード')) {
                    planId = 'standard'
                  } else if (nameLower.includes('pro') || nameLower.includes('プロ')) {
                    planId = 'pro'
                  } else if (nameLower.includes('business') || nameLower.includes('ビジネス') || nameLower.includes('enterprise') || nameLower.includes('エンタープライズ')) {
                    planId = 'business'
                  }
                  if (planId) {
                    console.log('planId from product name:', planId)
                  }
                }
              } catch (err) {
                console.error('Failed to retrieve product', err)
              }
            }

            // 金額からプランを判定（最終手段）
            if (!planId && priceAmount) {
              // 年額の場合は12で割って月額換算
              const interval = firstItem?.price?.recurring?.interval
              const monthlyAmount = interval === 'year' ? Math.round(priceAmount / 12) : priceAmount

              // 月額料金でプラン判定（年額換算後）
              // standard: 14800/月 or 9800/月(年額) → <= 15000
              // pro: 29800/月 or 19800/月(年額) → <= 25000
              // business: 49800/月 or 29800/月(年額) → > 25000
              if (monthlyAmount <= 15000) {
                planId = 'standard'
              } else if (monthlyAmount <= 25000) {
                planId = 'pro'
              } else {
                planId = 'business'
              }
              console.log('planId from price amount:', planId, { priceAmount, interval, monthlyAmount })
            }
          }

          // planId が取得できなかった場合の警告
          if (!planId) {
            console.warn('WARNING: Could not determine planId from subscription items')
          }

          console.log('subscription update detected', {
            customerId,
            planId,
            status: sub.status,
            items: sub.items?.data?.length,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end
          })

          // 更新データを構築（undefined対策: fallback値を使用）
          const now = Math.floor(Date.now() / 1000)
          const periodStart = sub.current_period_start || now
          const periodEnd = sub.current_period_end || (now + 30 * 24 * 60 * 60)

          const updateData: Record<string, any> = {
            stripe_subscription_id: sub.id,
            status: statusMap[sub.status] || 'active',
            current_period_start: new Date(periodStart * 1000).toISOString(),
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end ?? false
          }

          // プランが判明した場合はプラン情報も更新
          if (planId && ['standard', 'pro', 'business'].includes(planId)) {
            updateData.plan = planId
            updateData.monthly_download_limit = planId === 'business' ? 50 : planId === 'pro' ? 30 : 15
          }

          const { error: updateError } = await supabaseAdmin.from('subscriptions')
            .update(updateData)
            .eq('stripe_customer_id', customerId)
          if (updateError) {
            console.error('supabase subscriptions update error', updateError)
            throw updateError
          }

          console.log('subscription update success', { customerId, planId, updateData })

          // checkout_sessions の状態更新
          if (data?.user_id) {
            const { error: checkoutUpdateError } = await supabaseAdmin.from('checkout_sessions')
              .update({ status: 'completed', completed_at: new Date() })
              .eq('user_id', data.user_id)
            if (checkoutUpdateError) {
              console.error('checkout_sessions update error', checkoutUpdateError)
              throw checkoutUpdateError
            }
          }
        }
        break
      }
      default:
        // noop
        break
    }
    res.status(200).json({ received: true })
  } catch (err: any) {
    console.error('stripe-webhook handler error', err?.message || err, err)
    res.status(500).json({ error: 'Webhook handler error' })
  }
}

// Read raw body from Node request without extra deps
function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
