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

    // 認証確認
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // リクエストボディの解析
    const { paymentIntentId, action } = await req.json()

    if (!paymentIntentId) {
      throw new Error('Missing required parameter: paymentIntentId')
    }

    // 決済履歴から対象の決済を検索
    const { data: payment } = await supabase
      .from('payment_history')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .eq('user_id', user.id)
      .single()

    if (!payment) {
      throw new Error('Payment not found or unauthorized')
    }

    // PaymentIntentを取得
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (!paymentIntent.invoice) {
      throw new Error('No invoice associated with this payment')
    }

    // アクションに応じて処理
    switch (action) {
      case 'download': {
        // 請求書を取得
        const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string)
        
        if (!invoice.invoice_pdf) {
          throw new Error('Invoice PDF not available')
        }

        // 監査ログ
        await supabase.rpc('log_audit_event', {
          p_user_id: user.id,
          p_action: 'invoice_download',
          p_resource_type: 'payment',
          p_resource_id: payment.id,
          p_details: { 
            payment_intent_id: paymentIntentId,
            invoice_id: invoice.id 
          },
          p_severity: 'low'
        })

        return new Response(
          JSON.stringify({ 
            download_url: invoice.invoice_pdf,
            invoice_number: invoice.number,
            amount: invoice.amount_paid,
            currency: invoice.currency
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
      
      case 'details': {
        // 請求書詳細を取得
        const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string, {
          expand: ['payment_intent', 'subscription', 'customer']
        })

        return new Response(
          JSON.stringify({
            invoice: {
              id: invoice.id,
              number: invoice.number,
              status: invoice.status,
              amount_paid: invoice.amount_paid,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
              created: invoice.created,
              due_date: invoice.due_date,
              hosted_invoice_url: invoice.hosted_invoice_url,
              invoice_pdf: invoice.invoice_pdf,
              customer_email: invoice.customer_email,
              description: invoice.description,
              lines: invoice.lines.data.map(line => ({
                id: line.id,
                description: line.description,
                amount: line.amount,
                quantity: line.quantity,
                price: line.price
              }))
            },
            payment_intent: {
              id: paymentIntent.id,
              status: paymentIntent.status,
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              created: paymentIntent.created
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }

      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('Stripe invoice error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})