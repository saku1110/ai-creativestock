import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin.js';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = req.query.userId as string;
  const videoId = req.query.videoId as string;
  const action = req.query.action as string; // 'list' | 'record' | 'usage'
  const since = req.query.since as string; // ISO date string for usage calculation

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // ========== action: list ==========
    // ユーザーのダウンロード済み動画IDリストを取得
    if (action === 'list') {
      const { data, error } = await supabaseAdmin
        .from('download_history')
        .select('video_id')
        .eq('user_id', userId);

      if (error) throw error;
      return res.status(200).json({ videoIds: data?.map(d => d.video_id) || [] });
    }

    // ========== action: usage ==========
    // 指定期間内のユニークダウンロード数を取得（月間制限計算用）
    if (action === 'usage') {
      let query = supabaseAdmin
        .from('download_history')
        .select('video_id')
        .eq('user_id', userId);

      if (since) {
        query = query.gte('downloaded_at', since);
      }

      const { data, error } = await query;

      if (error) throw error;

      // ユニーク動画数をカウント
      const uniqueVideoIds = new Set(data?.map(d => d.video_id) || []);
      return res.status(200).json({
        count: uniqueVideoIds.size,
        videoIds: Array.from(uniqueVideoIds)
      });
    }

    // ========== action: record (POST) ==========
    // 新しいダウンロードを記録（冪等: 既存なら alreadyDownloaded=true を返す）
    if (action === 'record' && videoId && req.method === 'POST') {
      // 既存チェック
      const { data: existing } = await supabaseAdmin
        .from('download_history')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

      if (existing) {
        // 既にダウンロード済み → カウントしない
        return res.status(200).json({ success: true, alreadyDownloaded: true });
      }

      // 初回ダウンロード → 履歴追加
      const { error: insertError } = await supabaseAdmin
        .from('download_history')
        .insert({ user_id: userId, video_id: videoId, downloaded_at: new Date().toISOString() });

      // ユニーク制約違反の場合も成功扱い（競合状態対策）
      if (insertError && insertError.code === '23505') {
        return res.status(200).json({ success: true, alreadyDownloaded: true });
      }
      if (insertError) throw insertError;

      // download_countをインクリメント
      const { error: rpcError } = await supabaseAdmin.rpc('increment_download_count', { video_uuid: videoId });
      if (rpcError) {
        console.warn('increment_download_count RPC error (non-fatal):', rpcError);
      }

      return res.status(200).json({ success: true, alreadyDownloaded: false });
    }

    return res.status(400).json({ error: 'Invalid action. Use: list, usage, or record' });
  } catch (err: any) {
    console.error('download-history error', err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
}
