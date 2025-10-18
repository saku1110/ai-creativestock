import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '*'
  const requestedHeaders = req.headers.get('Access-Control-Request-Headers')

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': requestedHeaders
      ? `${requestedHeaders}`
      : 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Headers',
  }
}

interface EmailRequest {
  to: string;
  subject?: string;
  template: keyof typeof EMAIL_TEMPLATES;
  data?: Record<string, any>;
}

const EMAIL_TEMPLATES = {
  subscription_created: {
    subject: 'AI Creative Stock - サブスクリプション開始のお知らせ',
    html: (data: any) => `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 サブスクリプション開始！</h1>
        </div>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${data.user_name}様</h2>
          <p style="color: #666; line-height: 1.6;">
            AI Creative Stockのご利用開始ありがとうございます！<br>
            ${data.plan_name}プランのサブスクリプションが正常に開始されました。
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #06b6d4;">
            <h3 style="margin-top: 0; color: #333;">プラン詳細</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>プラン:</strong> ${data.plan_name}</li>
              <li><strong>月間ダウンロード数:</strong> ${data.download_limit}本</li>
              <li><strong>料金:</strong> ${data.amount}</li>
              <li><strong>請求サイクル:</strong> ${data.billing_cycle === 'yearly' ? '年額' : '月額'}</li>
              <li><strong>次回請求日:</strong> ${data.next_billing_date}</li>
            </ul>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboard_url}" style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            ダッシュボードにアクセス
          </a>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>💡 はじめに:</strong> ダッシュボードから高品質なAI動画素材をダウンロードできます。カテゴリやフィルターを使って、あなたのプロジェクトに最適な素材を見つけてください。
          </p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>ご質問やサポートが必要な場合は、お気軽にお問い合わせください。</p>
          <p style="margin: 0;">AI Creative Stockチーム</p>
        </div>
      </div>
    `,
  },
  subscription_updated: {
    subject: 'AI Creative Stock - プラン変更のお知らせ',
    html: (data: any) => `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📈 プラン変更完了</h1>
        </div>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${data.user_name}様</h2>
          <p style="color: #666; line-height: 1.6;">
            プランの変更が正常に完了しました。<br>
            新しいプランの詳細をご確認ください。
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
            <h3 style="margin-top: 0; color: #333;">新プラン詳細</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>プラン:</strong> ${data.plan_name}</li>
              <li><strong>月間ダウンロード数:</strong> ${data.download_limit}本</li>
              <li><strong>料金:</strong> ${data.amount}</li>
              <li><strong>適用日:</strong> ${data.effective_date}</li>
            </ul>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboard_url}" style="background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            ダッシュボードを確認
          </a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          <p style="margin: 0;">AI Creative Stockチーム</p>
        </div>
      </div>
    `,
  },
  subscription_cancelled: {
    subject: 'AI Creative Stock - サブスクリプション解約のお知らせ',
    html: (data: any) => `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #6c757d; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 解約完了のお知らせ</h1>
        </div>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${data.user_name}様</h2>
          <p style="color: #666; line-height: 1.6;">
            AI Creative Stockのサブスクリプション解約手続きが完了しました。<br>
            ご利用いただき、誠にありがとうございました。
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6c757d;">
            <h3 style="margin-top: 0; color: #333;">解約詳細</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>解約プラン:</strong> ${data.plan_name}</li>
              <li><strong>サービス終了日:</strong> ${data.end_date}</li>
              <li><strong>残りダウンロード数:</strong> ${data.remaining_downloads}本</li>
            </ul>
          </div>
        </div>
        <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #0c5460;">
            <strong>📅 重要:</strong> ${data.end_date}まではサービスをご利用いただけます。それ以降は新規ダウンロードができなくなります。
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.pricing_url}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            再度ご利用を検討する
          </a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>今後ともAI Creative Stockをよろしくお願いいたします。ご質問やご要望がございましたら、お気軽にお問い合わせください。</p>
          <p style="margin: 0;">AI Creative Stockチーム</p>
        </div>
      </div>
    `,
  },
  payment_succeeded: {
    subject: 'AI Creative Stock - お支払い完了のお知らせ',
    html: (data: any) => `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💳 お支払い完了</h1>
        </div>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${data.user_name}様</h2>
          <p style="color: #666; line-height: 1.6;">
            お支払いが正常に処理されました。<br>
            請求書の詳細をご確認ください。
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3 style="margin-top: 0; color: #333;">請求詳細</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>プラン:</strong> ${data.plan_name}</li>
              <li><strong>請求金額:</strong> ${data.amount}</li>
              <li><strong>請求日:</strong> ${data.payment_date}</li>
              <li><strong>請求期間:</strong> ${data.service_period}</li>
              <li><strong>次回請求日:</strong> ${data.next_billing_date}</li>
            </ul>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.invoice_url}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            請求書をダウンロード
          </a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>ご利用いただき、ありがとうございます。</p>
          <p style="margin: 0;">AI Creative Stockチーム</p>
        </div>
      </div>
    `,
  },
  payment_failed: {
    subject: 'AI Creative Stock - お支払いエラーのお知らせ',
    html: (data: any) => `
      <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #dc3545; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ お支払いエラー</h1>
        </div>
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">${data.user_name}様</h2>
          <p style="color: #666; line-height: 1.6;">
            サブスクリプションの自動更新時にお支払いエラーが発生しました。<br>
            サービスの継続利用のため、お支払い方法の確認をお願いいたします。
          </p>
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #721c24;">エラー詳細</h3>
            <ul style="color: #721c24; line-height: 1.8;">
              <li><strong>プラン:</strong> ${data.plan_name}</li>
              <li><strong>請求金額:</strong> ${data.amount}</li>
              <li><strong>エラー発生日:</strong> ${data.error_date}</li>
              <li><strong>再試行予定:</strong> ${data.retry_date}</li>
            </ul>
          </div>
        </div>
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>🚨 重要:</strong> ${data.grace_period_end}までにお支払い方法を更新いただけない場合、サービスが停止される可能性があります。
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.billing_portal_url}" style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            お支払い方法を更新
          </a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>ご不明な点がございましたら、サポートまでお問い合わせください。</p>
          <p style="margin: 0;">AI Creative Stockチーム</p>
        </div>
      </div>
    `,
  },
  video_request: {
    subject: 'AI Creative Stock - 新しい動画リクエストが届きました',
    html: (data: any) => {
      const detailRow = (label: string, value: string) => `
        <tr>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eef1f4; color: #6b7280; width: 140px;">${label}</td>
          <td style="padding: 10px 15px; border-bottom: 1px solid #eef1f4; color: #111827;">${value || '未指定'}</td>
        </tr>
      `

      return `
        <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 640px; margin: 0 auto; background: #f9fafb; padding: 32px;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #f97316 100%); padding: 28px; border-radius: 16px; text-align: center; color: white; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 22px;">🎬 新しい動画リクエスト</h1>
            <p style="margin-top: 8px; font-size: 14px; opacity: 0.85;">AI Creative Stock ダッシュボードからリクエストが届きました</p>
          </div>
          <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(236, 72, 153, 0.25); overflow: hidden; border: 1px solid #f3f4f6;">
            <div style="padding: 20px 24px; border-bottom: 1px solid #f3f4f6;">
              <h2 style="margin: 0; color: #111827; font-size: 18px;">リクエスト概要</h2>
              <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">${data?.requested_at ?? ''}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              ${detailRow('年齢', data?.age)}
              ${detailRow('性別', data?.gender)}
              ${detailRow('体型', data?.body_type)}
              ${detailRow('背景', data?.background)}
              ${detailRow('シーン', data?.scene)}
              ${detailRow('顔の特徴', data?.face_detail)}
              ${detailRow('その他', data?.notes)}
            </table>
          </div>
          <div style="margin-top: 24px; background: white; border-radius: 16px; padding: 24px; border: 1px dashed #f472b6;">
            <h3 style="margin: 0; color: #be185d; font-size: 16px;">リクエスト送信者</h3>
            <ul style="margin: 12px 0 0; padding-left: 18px; color: #6b7280; line-height: 1.7; font-size: 14px;">
              <li><strong>メール:</strong> ${data?.user_email ?? '不明'}</li>
              <li><strong>ユーザーID:</strong> ${data?.user_id ?? '不明'}</li>
            </ul>
          </div>
          <p style="margin-top: 24px; color: #6b7280; font-size: 13px; text-align: center;">
            ※ このメールは自動送信されています。返信は不要です。<br />
            詳細な対応はダッシュボードのリクエスト管理から行ってください。
          </p>
        </div>
      `
    },
  },
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    if (!resendApiKey) {
      throw new Error('Missing email service configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { to, subject, template, data }: EmailRequest = await req.json()

    if (!to || !template) {
      throw new Error('Missing required parameters')
    }

    const emailTemplate = EMAIL_TEMPLATES[template]
    if (!emailTemplate) {
      throw new Error('Invalid email template')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI Creative Stock <noreply@ai-creativestock.com>',
        to: [to],
        subject: subject || emailTemplate.subject,
        html: emailTemplate.html(data || {}),
      }),
    })

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text()
      throw new Error(`Email service error: ${errorData}`)
    }

    const emailResult = await emailResponse.json()

    await supabase.rpc('log_audit_event', {
      p_user_id: data?.user_id || null,
      p_action: 'email_sent',
      p_resource_type: 'notification',
      p_details: {
        template,
        recipient: to,
        email_id: emailResult.id,
      },
      p_severity: 'low',
    })

    return new Response(
      JSON.stringify({ success: true, email_id: emailResult.id, template_used: template }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('Email sending error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
