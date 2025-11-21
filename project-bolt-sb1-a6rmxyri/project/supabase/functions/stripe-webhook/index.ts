import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEND_MAIL_FUNCTION_PATH = 'send-email'

type SupabaseClient = ReturnType<typeof createClient>

type BillingCycle = 'monthly' | 'yearly'

interface PlanDetails {
  plan: 'standard' | 'pro' | 'business'
  monthlyDownloadLimit: number
  billingCycle: BillingCycle
}

interface EnvConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  appUrl?: string
}

const PRICE_PLAN_MAP: Record<string, PlanDetails> = {
  // Standard
  'price_1QZyaQKpWTNKTKELRgQTOJKD': { plan: 'standard', monthlyDownloadLimit: 15, billingCycle: 'monthly' },
  'price_standard_monthly_prod': { plan: 'standard', monthlyDownloadLimit: 15, billingCycle: 'monthly' },
  'price_1QZyeRKpWTNKTKELStandardYear': { plan: 'standard', monthlyDownloadLimit: 15, billingCycle: 'yearly' },
  'price_standard_yearly_prod': { plan: 'standard', monthlyDownloadLimit: 15, billingCycle: 'yearly' },

  // Pro
  'price_1QZybDKpWTNKTKELQfQbRKMN': { plan: 'pro', monthlyDownloadLimit: 30, billingCycle: 'monthly' },
  'price_pro_monthly_prod': { plan: 'pro', monthlyDownloadLimit: 30, billingCycle: 'monthly' },
  'price_1QZyeRKpWTNKTKELProYear': { plan: 'pro', monthlyDownloadLimit: 30, billingCycle: 'yearly' },
  'price_pro_yearly_prod': { plan: 'pro', monthlyDownloadLimit: 30, billingCycle: 'yearly' },

  // Business (旧 Enterprise)
  'price_1QZybdKpWTNKTKELPfRdSLOP': { plan: 'business', monthlyDownloadLimit: 50, billingCycle: 'monthly' },
  'price_enterprise_monthly_prod': { plan: 'business', monthlyDownloadLimit: 50, billingCycle: 'monthly' },
  'price_1QZyeRKpWTNKTKELEnterpriseYear': { plan: 'business', monthlyDownloadLimit: 50, billingCycle: 'yearly' },
  'price_enterprise_yearly_prod': { plan: 'business', monthlyDownloadLimit: 50, billingCycle: 'yearly' },
}

const PLAN_LABEL: Record<PlanDetails['plan'], string> = {
  standard: 'スタンダード',
  pro: 'プロ',
  business: 'ビジネス',
}

function resolvePlanDetails(priceId?: string | null): PlanDetails | null {
  if (!priceId) return null
  return PRICE_PLAN_MAP[priceId] ?? null
}

function billingLabel(cycle: BillingCycle) {
  return cycle === 'yearly' ? '年額' : '月額'
}

function toIso(timestamp?: number | null) {
  if (!timestamp) return null
  return new Date(timestamp * 1000).toISOString()
}

function toDateDisplay(timestamp?: number | null) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleDateString('ja-JP')
}

function formatAmount(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || currency == null) return ''
  const value = amount / 100
  try {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: currency.toUpperCase() }).format(value)
  } catch {
    return `${value} ${currency.toUpperCase()}`
  }
}

async function sendEmail(
  env: EnvConfig,
  to: string | null | undefined,
  template: string,
  data: Record<string, unknown>,
  subject?: string,
) {
  if (!to) {
    console.warn('sendEmail skipped: missing recipient address')
    return
  }

  try {
    const response = await fetch(`${env.supabaseUrl}/functions/v1/${SEND_MAIL_FUNCTION_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        to,
        template,
        subject,
        data,
      }),
    })

    if (!response.ok) {
      console.error('sendEmail failed:', await response.text())
    }
  } catch (error) {
    console.error('sendEmail error:', error)
  }
}

async function fetchUserProfile(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name, full_name')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Unexpected error fetching profile:', error)
    return null
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient,
  stripe: Stripe,
  env: EnvConfig,
) {
  try {
    const userId = session.metadata?.user_id
    if (!userId) {
      console.error('handleCheckoutCompleted: missing user_id metadata')
      return
    }

    if (!session.subscription) {
      console.error('handleCheckoutCompleted: missing subscription reference')
      return
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
    const priceId = subscription.items.data[0]?.price?.id ?? null
    const planDetails = resolvePlanDetails(priceId)

    if (!planDetails) {
      console.error('handleCheckoutCompleted: unknown price ID', priceId)
      return
    }

    const customerId = typeof session.customer === 'string' ? session.customer : null

    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert([
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan: planDetails.plan,
          status: subscription.status,
          current_period_start: toIso(subscription.current_period_start),
          current_period_end: toIso(subscription.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          monthly_download_limit: planDetails.monthlyDownloadLimit,
        },
      ])

    if (upsertError) {
      console.error('handleCheckoutCompleted: upsert error', upsertError)
    }

    if (session.payment_intent && session.amount_total && session.currency) {
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert([
          {
            stripe_payment_intent_id: session.payment_intent,
            amount: session.amount_total,
            currency: session.currency,
            status: 'succeeded',
            plan: planDetails.plan,
            billing_period: planDetails.billingCycle,
          },
        ])

      if (paymentError) {
        console.error('handleCheckoutCompleted: payment history insert error', paymentError)
      }
    }

    const profile = await fetchUserProfile(supabase, userId)
    await sendEmail(env, profile?.email, 'subscription_created', {
      user_name: profile?.full_name || profile?.name || '',
      plan_name: PLAN_LABEL[planDetails.plan],
      download_limit: planDetails.monthlyDownloadLimit,
      amount: formatAmount(subscription.items.data[0]?.price?.unit_amount, subscription.currency || 'jpy'),
      billing_cycle: planDetails.billingCycle,
      next_billing_date: toDateDisplay(subscription.current_period_end),
      dashboard_url: env.appUrl ? `${env.appUrl}/dashboard` : '',
    })
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error)
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
  env: EnvConfig,
) {
  try {
    const userId = subscription.metadata?.user_id
    if (!userId) {
      console.error('handleSubscriptionCreated: missing user_id metadata')
      return
    }

    const priceId = subscription.items.data[0]?.price?.id ?? null
    const planDetails = resolvePlanDetails(priceId)

    if (!planDetails) {
      console.error('handleSubscriptionCreated: unknown price ID', priceId)
      return
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert([
        {
          user_id: userId,
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscription.id,
          plan: planDetails.plan,
          status: subscription.status,
          current_period_start: toIso(subscription.current_period_start),
          current_period_end: toIso(subscription.current_period_end),
          cancel_at_period_end: subscription.cancel_at_period_end,
          monthly_download_limit: planDetails.monthlyDownloadLimit,
        },
      ])

    if (error) {
      console.error('handleSubscriptionCreated: upsert error', error)
    }

    const profile = await fetchUserProfile(supabase, userId)
    await sendEmail(env, profile?.email, 'subscription_created', {
      user_name: profile?.full_name || profile?.name || '',
      plan_name: PLAN_LABEL[planDetails.plan],
      download_limit: planDetails.monthlyDownloadLimit,
      amount: formatAmount(subscription.items.data[0]?.price?.unit_amount, subscription.currency || 'jpy'),
      billing_cycle: planDetails.billingCycle,
      next_billing_date: toDateDisplay(subscription.current_period_end),
      dashboard_url: env.appUrl ? `${env.appUrl}/dashboard` : '',
    })
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error)
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
  env: EnvConfig,
) {
  try {
    const priceId = subscription.items.data[0]?.price?.id ?? null
    const planDetails = resolvePlanDetails(priceId)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: toIso(subscription.current_period_start),
        current_period_end: toIso(subscription.current_period_end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(planDetails
          ? {
              plan: planDetails.plan,
              monthly_download_limit: planDetails.monthlyDownloadLimit,
            }
          : {}),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('handleSubscriptionUpdated: update error', error)
    }

    if (!subscription.metadata?.user_id || !planDetails) return

    const profile = await fetchUserProfile(supabase, subscription.metadata.user_id)
    await sendEmail(env, profile?.email, 'subscription_updated', {
      user_name: profile?.full_name || profile?.name || '',
      plan_name: PLAN_LABEL[planDetails.plan],
      download_limit: planDetails.monthlyDownloadLimit,
      amount: formatAmount(subscription.items.data[0]?.price?.unit_amount, subscription.currency || 'jpy'),
      effective_date: toDateDisplay(subscription.current_period_start),
      dashboard_url: env.appUrl ? `${env.appUrl}/dashboard` : '',
    })
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error)
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient,
  env: EnvConfig,
) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('handleSubscriptionDeleted: update error', error)
    }

    const priceId = subscription.items.data[0]?.price?.id ?? null
    const planDetails = resolvePlanDetails(priceId)

    if (!subscription.metadata?.user_id || !planDetails) return

    const profile = await fetchUserProfile(supabase, subscription.metadata.user_id)
    await sendEmail(env, profile?.email, 'subscription_cancelled', {
      user_name: profile?.full_name || profile?.name || '',
      plan_name: PLAN_LABEL[planDetails.plan],
      end_date: toDateDisplay(subscription.current_period_end),
      remaining_downloads: 0,
      pricing_url: env.appUrl ? `${env.appUrl}/pricing` : '',
    })
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error)
  }
}

async function handlePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient,
  env: EnvConfig,
) {
  try {
    if (!invoice.subscription) return

    const { error } = await supabase
      .from('payment_history')
      .insert([
        {
          stripe_payment_intent_id: invoice.payment_intent,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          billing_period: invoice.lines.data[0]?.plan?.interval ?? 'monthly',
        },
      ])

    if (error) {
      console.error('handlePaymentSucceeded: insert error', error)
    }

    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id
    const { data: subscriptionRecord } = await supabase
      .from('subscriptions')
      .select('user_id, plan')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (!subscriptionRecord?.user_id) return

    const profile = await fetchUserProfile(supabase, subscriptionRecord.user_id)
    if (!profile?.email) return

    await sendEmail(env, profile.email, 'payment_succeeded', {
      user_name: profile.full_name || profile.name || '',
      plan_name: PLAN_LABEL[(subscriptionRecord.plan as PlanDetails['plan']) ?? 'standard'],
      amount: formatAmount(invoice.amount_paid, invoice.currency),
      payment_date: invoice.status_transitions?.paid_at
        ? toDateDisplay(invoice.status_transitions.paid_at)
        : toDateDisplay(invoice.created),
      service_period: `${toDateDisplay(invoice.period_start)} 〜 ${toDateDisplay(invoice.period_end)}`,
      next_billing_date: invoice.next_payment_attempt ? toDateDisplay(invoice.next_payment_attempt) : '',
      invoice_url: invoice.hosted_invoice_url || '',
    })
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error)
  }
}

async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: SupabaseClient,
  env: EnvConfig,
) {
  try {
    if (!invoice.subscription) return

    const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id

    const { error: statusError } = await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscriptionId)

    if (statusError) {
      console.error('handlePaymentFailed: subscription status update error', statusError)
    }

    const { error: historyError } = await supabase
      .from('payment_history')
      .insert([
        {
          stripe_payment_intent_id: invoice.payment_intent,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          billing_period: invoice.lines.data[0]?.plan?.interval ?? 'monthly',
        },
      ])

    if (historyError) {
      console.error('handlePaymentFailed: payment history insert error', historyError)
    }

    const { data: subscriptionRecord } = await supabase
      .from('subscriptions')
      .select('user_id, plan')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle()

    if (!subscriptionRecord?.user_id) return

    const profile = await fetchUserProfile(supabase, subscriptionRecord.user_id)
    if (!profile?.email) return

    await sendEmail(env, profile.email, 'payment_failed', {
      user_name: profile.full_name || profile.name || '',
      plan_name: PLAN_LABEL[(subscriptionRecord.plan as PlanDetails['plan']) ?? 'standard'],
      amount: formatAmount(invoice.amount_due, invoice.currency),
      error_date: toDateDisplay(invoice.created),
      retry_date: invoice.next_payment_attempt ? toDateDisplay(invoice.next_payment_attempt) : '',
      grace_period_end: invoice.due_date ? toDateDisplay(invoice.due_date) : '',
      billing_portal_url: env.appUrl ? `${env.appUrl}/settings/billing` : '',
    })
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const appUrl = Deno.env.get('VITE_APP_URL') ?? Deno.env.get('APP_URL') ?? Deno.env.get('SITE_URL') ?? undefined

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const env: EnvConfig = {
      supabaseUrl,
      supabaseServiceRoleKey: supabaseServiceKey,
      appUrl,
    }

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('Missing stripe signature', { status: 400 })
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    console.log('Received event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase, stripe, env)
        break
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, supabase, env)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase, env)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase, env)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, supabase, env)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase, env)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Internal server error', { status: 500 })
  }
})
