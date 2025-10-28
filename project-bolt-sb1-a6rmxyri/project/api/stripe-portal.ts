import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
if (!stripeSecret) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}
const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { customerId, returnUrl } = req.body || {}
    if (!customerId) return res.status(400).json({ error: 'customerId is required' })

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${req.headers.origin}/mypage`
    })

    return res.status(200).json({ url: portal.url })
  } catch (err: any) {
    console.error('stripe-portal error', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}

