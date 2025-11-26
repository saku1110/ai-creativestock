import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin.js';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[subscription-info] request received', { method: req.method, query: req.query });

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 優先: Bearer token で検証
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    let userId = req.query.userId as string | undefined;

    console.log('[subscription-info] auth check', { hasToken: !!token, queryUserId: userId });

    if (token) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
      console.log('[subscription-info] token auth result', { userId: userData?.user?.id, error: userError?.message });
      if (userError || !userData?.user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      userId = userData.user.id;
    }

    if (!userId) {
      console.log('[subscription-info] no userId provided');
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('[subscription-info] fetching subscription for userId:', userId);

    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    console.log('[subscription-info] supabase result', { subscription, error: subError?.message });

    if (subError) {
      return res.status(500).json({ error: subError.message });
    }

    return res.status(200).json({ subscription });
  } catch (err: any) {
    console.error('[subscription-info] error', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
}
