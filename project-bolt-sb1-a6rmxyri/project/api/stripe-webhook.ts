import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { supabaseAdmin } from './_supabaseAdmin.js'

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

          const { error: updateError } = await supabaseAdmin.from('subscriptions')
            .update({
              stripe_subscription_id: sub.id,
              status: statusMap[sub.status] || 'active',
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end ?? false
            })
            .eq('stripe_customer_id', customerId)
          if (updateError) {
            console.error('supabase subscriptions update error', updateError)
            throw updateError
          }

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
