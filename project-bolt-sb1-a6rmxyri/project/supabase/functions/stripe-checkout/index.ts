import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORSプリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数の確認
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Stripe初期化
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Supabase初期化
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // リクエストボディの解析
    const { priceId, userId, billing, planId, successUrl, cancelUrl } = await req.json()

    if (!priceId || !userId || !billing || !planId) {
      throw new Error('Missing required parameters: priceId, userId, billing, and planId')
    }

    // Security: throttle checkout session creation per user
    try {
      const { data: rl, error: rlError } = await supabase.rpc('check_rate_limit', {
        p_identifier: userId,
        p_action_type: 'checkout',
        p_window_minutes: 10,
        p_max_requests: 5,
      })
      if (rlError) throw rlError
      if (rl && (rl as any).allowed === false) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 },
        )
      }
    } catch (e) {
      console.error('Rate limit check failed:', e)
    }

    // ユーザー情報の取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single()

    if (profileError) {
      throw new Error('User profile not found')
    }

    // 既存のStripeカスタマーを確認
    let stripeCustomerId: string
    
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (existingSubscription?.stripe_customer_id) {
      stripeCustomerId = existingSubscription.stripe_customer_id
    } else {
      // 新しいStripeカスタマーを作成
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.name,
        metadata: {
          supabase_user_id: userId,
        },
      })
      stripeCustomerId = customer.id
    }

    // チェックアウトセッションを作成
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.headers.get('origin')}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/payment/cancel`,
      metadata: {
        user_id: userId,
        price_id: priceId,
        billing_cycle: billing,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          billing_cycle: billing,
          plan_id: planId,
        },
      },
      customer_update: {
        address: 'auto',
      },
      automatic_tax: {
        enabled: false,
      },
      billing_address_collection: 'auto',
      locale: 'ja',
    })

    // セッション情報を一時的に保存（オプション）
    await supabase
      .from('checkout_sessions')
      .insert([
        {
          session_id: session.id,
          user_id: userId,
          price_id: priceId,
          customer_id: stripeCustomerId,
          billing_cycle: billing,
          plan_id: planId,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    return new Response(JSON.stringify({ sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return new Response(JSON.stringify({ error: 'Payment processing error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
