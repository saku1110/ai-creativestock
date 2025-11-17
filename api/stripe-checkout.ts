import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!supabaseUrl) throw new Error('Missing SUPABASE_URL for admin client')
if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_KEY for admin client')
const { createClient } = await import('@supabase/supabase-js')
const supabaseAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

export const config = {
  api: {
    bodyParser: false
  }
}

async function readJsonBody(req: VercelRequest) {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Invalid JSON payload')
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[api] stripe-checkout invoked', {
    method: req.method,
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent']
  })
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const body = await readJsonBody(req)
    console.log('[api] parsed body keys', Object.keys(body || {}))
    const { priceId, userId, billing, planId, successUrl, cancelUrl } = body || {}
    if (!priceId || !userId) {
      return res.status(400).json({ error: 'priceId and userId are required' })
    }

    let customerId: string | undefined
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sub?.stripe_customer_id) customerId = sub.stripe_customer_id

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .maybeSingle()

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.name,
        metadata: { user_id: userId }
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      payment_method_types: ['link', 'card'],
      success_url: successUrl || `${req.headers.origin}/payment/success`,
      cancel_url: cancelUrl || `${req.headers.origin}/payment/cancel`,
      metadata: {
        user_id: userId,
        plan_id: planId || '',
        billing: billing || 'monthly'
      }
    })

    await supabaseAdmin.from('checkout_sessions').insert({
      session_id: session.id,
      user_id: userId,
      price_id: priceId,
      customer_id: customerId,
      billing_cycle: billing || 'monthly',
      plan_id: planId || ''
    })

    return res.status(200).json({ sessionId: session.id })
  } catch (err: any) {
    console.error('stripe-checkout error', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
