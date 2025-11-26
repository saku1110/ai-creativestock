// ダウンロード制限管理システム
import { supabase } from './supabase';
import { subscriptionPlans, getPlanById } from './stripe';

/**
 * ウォーターマーク付き動画URLをオリジナル動画URLに変換
 * 例: local-content/dashboard/beauty/video-wm-alpha200.mp4
 *   → local-content/dashboard-originals/video.mp4
 *
 * dashboard-originalsフォルダには直接すべての動画が入っている（サブフォルダなし）
 */
export function convertToOriginalUrl(watermarkedUrl: string): string {
  // URLからファイル名を抽出
  const fileName = watermarkedUrl.split('/').pop() || '';
  // -wm-alpha200 を削除
  const originalFileName = fileName.replace(/-wm-alpha200/, '');
  // /dashboard/任意のサブパス/ を /dashboard-originals/ に置換
  const dashboardIndex = watermarkedUrl.lastIndexOf('/dashboard/');
  if (dashboardIndex === -1) {
    // /dashboard/ がない場合はそのまま返す
    return watermarkedUrl;
  }
  const baseUrl = watermarkedUrl.substring(0, dashboardIndex + 1);
  return `${baseUrl}dashboard-originals/${originalFileName}`;
}

/**
 * ダウンロード制限の設定
 */
export interface DownloadLimitConfig {
  planId: string;
  monthlyLimit: number;
  resetDay: number; // 月の何日にリセットするか（1-31）
  gracePeriod: number; // 猶予期間（日数）
}

/**
 * ダウンロード使用状況
 */
export interface DownloadUsage {
  userId: string;
  planId: string;
  monthlyLimit: number;
  currentUsage: number;
  remaining: number;
  resetDate: Date;
  isLimitExceeded: boolean;
  canDownload: boolean;
}

/**
 * ダウンロード制限チェック結果
 */
export interface DownloadLimitResult {
  allowed: boolean;
  reason?: string;
  usage: DownloadUsage;
  warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded';
}

/**
 * ダウンロード制限管理クラス
 */
export class DownloadLimitManager {
  /**
   * ユーザーのダウンロード制限を取得
   */
  static async getUserDownloadLimit(userId: string): Promise<DownloadLimitConfig | null> {
    try {
      // まずサーバーAPIを使用（RLSをバイパス）
      try {
        const params = new URLSearchParams();
        params.set('userId', userId);
        params.set('_t', Date.now().toString()); // キャッシュバスター

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        console.log('[downloadLimits] fetching subscription via API for userId:', userId);
        const resp = await fetch(`/api/subscription-info?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        clearTimeout(timeoutId);

        console.log('[downloadLimits] API response status:', resp.status);
        if (resp.ok) {
          const json = await resp.json();
          const subscription = json.subscription;
          console.log('[downloadLimits] API subscription result:', subscription);

          if (subscription && (subscription.status === 'active' || subscription.status === 'trial')) {
            const planId = subscription.plan || subscription.plan_id;
            const plan = getPlanById(planId);
            console.log('[downloadLimits] planId:', planId, 'plan found:', !!plan);
            if (plan) {
              const createdAt = subscription.current_period_start || subscription.created_at;
              return {
                planId: planId,
                monthlyLimit: plan.monthlyDownloads,
                resetDay: createdAt ? new Date(createdAt).getDate() : 1,
                gracePeriod: ['business', 'enterprise'].includes(planId) ? 5 : 2
              };
            }
          }
        }
      } catch (apiError) {
        console.warn('[downloadLimits] サブスクリプションAPI取得エラー、フォールバックを試行:', apiError);
      }

      // フォールバック: 直接Supabaseアクセス
      console.log('[downloadLimits] falling back to direct Supabase access');
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      console.log('[downloadLimits] fallback result:', { subscription, error: error?.message });

      if (error || !subscription) {
        // サブスクリプションがない場合はフリープラン扱い
        console.log('[downloadLimits] no subscription found, using free plan');
        return {
          planId: 'free',
          monthlyLimit: 3, // フリープランは月3回まで
          resetDay: 1,
          gracePeriod: 0
        };
      }

      const plan = getPlanById(subscription.plan);
      if (!plan) {
        console.log('[downloadLimits] plan not found for:', subscription.plan);
        return null;
      }

      return {
        planId: subscription.plan,
        monthlyLimit: plan.monthlyDownloads,
        resetDay: new Date(subscription.created_at).getDate(),
        gracePeriod: ['business', 'enterprise'].includes(subscription.plan) ? 5 : 2
      };
    } catch (error) {
      console.error('[downloadLimits] ダウンロード制限取得エラー:', error);
      return null;
    }
  }

  /**
   * ユーザーの現在のダウンロード使用状況を取得
   */
  static async getUserDownloadUsage(userId: string): Promise<DownloadUsage | null> {
    try {
      const limitConfig = await this.getUserDownloadLimit(userId);
      if (!limitConfig) {
        return null;
      }

      // 現在の請求サイクルの開始日を計算
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const resetDay = Math.min(limitConfig.resetDay, new Date(currentYear, currentMonth + 1, 0).getDate());
      
      let cycleStart: Date;
      if (now.getDate() >= resetDay) {
        cycleStart = new Date(currentYear, currentMonth, resetDay);
      } else {
        cycleStart = new Date(currentYear, currentMonth - 1, resetDay);
      }

      // 次回リセット日を計算
      const nextResetDate = new Date(cycleStart);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      // サーバーAPI経由で現在の請求サイクルでのダウンロード数を取得（RLSをバイパス）
      let currentUsage = 0;
      try {
        const usageResp = await fetch(`/api/download-history?userId=${userId}&action=usage&since=${cycleStart.toISOString()}`);
        const usageResult = await usageResp.json();
        console.log('[downloadLimits] usage API result:', usageResult);
        currentUsage = usageResult.count || 0;
      } catch (apiError) {
        console.warn('[downloadLimits] usage API error, falling back to direct query:', apiError);
        // フォールバック: 直接Supabaseクエリ（RLSにブロックされる可能性あり）
        const { data: downloads, error } = await supabase
          .from('download_history')
          .select('video_id')
          .eq('user_id', userId)
          .gte('downloaded_at', cycleStart.toISOString())
          .lte('downloaded_at', now.toISOString());

        if (error) {
          throw error;
        }
        currentUsage = downloads ? new Set(downloads.map((d: any) => d.video_id)).size : 0;
      }
      const remaining = Math.max(0, limitConfig.monthlyLimit - currentUsage);
      const isLimitExceeded = currentUsage >= limitConfig.monthlyLimit;

      return {
        userId,
        planId: limitConfig.planId,
        monthlyLimit: limitConfig.monthlyLimit,
        currentUsage,
        remaining,
        resetDate: nextResetDate,
        isLimitExceeded,
        canDownload: !isLimitExceeded
      };
    } catch (error) {
      console.error('ダウンロード使用状況取得エラー:', error);
      return null;
    }
  }

  /**
   * ダウンロード可否をチェック
   */
  static async checkDownloadPermission(userId: string, videoId: string): Promise<DownloadLimitResult> {
    try {
      const usage = await this.getUserDownloadUsage(userId);
      if (!usage) {
        return {
          allowed: false,
          reason: 'ダウンロード制限情報の取得に失敗しました',
          usage: {
            userId,
            planId: 'unknown',
            monthlyLimit: 0,
            currentUsage: 0,
            remaining: 0,
            resetDate: new Date(),
            isLimitExceeded: true,
            canDownload: false
          },
          warningLevel: 'exceeded'
        };
      }

      // 制限を超えている場合
      if (usage.isLimitExceeded) {
        return {
          allowed: false,
          reason: `月間ダウンロード制限（${usage.monthlyLimit}本）に達しています。次回リセット: ${usage.resetDate.toLocaleDateString()}`,
          usage,
          warningLevel: 'exceeded'
        };
      }

      // 警告レベルを計算
      const usageRatio = usage.currentUsage / usage.monthlyLimit;
      let warningLevel: 'none' | 'low' | 'medium' | 'high' | 'exceeded' = 'none';
      
      if (usageRatio >= 0.9) {
        warningLevel = 'high';
      } else if (usageRatio >= 0.7) {
        warningLevel = 'medium';
      } else if (usageRatio >= 0.5) {
        warningLevel = 'low';
      }

      return {
        allowed: true,
        usage,
        warningLevel
      };
    } catch (error) {
      console.error('ダウンロード権限チェックエラー:', error);
      return {
        allowed: false,
        reason: 'ダウンロード権限の確認に失敗しました',
        usage: {
          userId,
          planId: 'unknown',
          monthlyLimit: 0,
          currentUsage: 0,
          remaining: 0,
          resetDate: new Date(),
          isLimitExceeded: true,
          canDownload: false
        },
        warningLevel: 'exceeded'
      };
    }
  }

  /**
   * ダウンロード実行とカウンターの更新
   */
  static async executeDownload(userId: string, videoId: string): Promise<{
    success: boolean;
    error?: string;
    downloadUrl?: string;
    usage?: DownloadUsage;
    alreadyDownloaded?: boolean;
  }> {
    try {
      // ダウンロード権限をチェック
      const permission = await this.checkDownloadPermission(userId, videoId);
      if (!permission.allowed) {
        return {
          success: false,
          error: permission.reason || 'ダウンロードが許可されていません'
        };
      }

      // 動画情報を取得
      const { data: video, error: videoError } = await supabase
        .from('video_assets')
        .select('file_url, title')
        .eq('id', videoId)
        .single();

      if (videoError || !video) {
        return {
          success: false,
          error: '動画が見つかりません'
        };
      }

      // サーバーAPI経由でダウンロード履歴を記録（RLSをバイパス）
      let alreadyDownloaded = false;
      try {
        const recordResp = await fetch(`/api/download-history?userId=${userId}&videoId=${videoId}&action=record`, {
          method: 'POST'
        });
        const recordResult = await recordResp.json();
        console.log('[downloadLimits] record API result:', recordResult);

        if (!recordResult.success) {
          console.error('ダウンロード履歴記録エラー:', recordResult.error);
          return {
            success: false,
            error: 'ダウンロード履歴の記録に失敗しました'
          };
        }

        alreadyDownloaded = recordResult.alreadyDownloaded || false;

        if (alreadyDownloaded) {
          console.log('[downloadLimits] 既にダウンロード済みの動画のため、カウントをスキップ');
        }
      } catch (apiError) {
        console.error('ダウンロード履歴API呼び出しエラー:', apiError);
        return {
          success: false,
          error: 'ダウンロード履歴の記録に失敗しました'
        };
      }

      // 更新後の使用状況を取得
      const updatedUsage = await this.getUserDownloadUsage(userId);

      // ウォーターマーク付きURLをオリジナルURLに変換
      const originalUrl = convertToOriginalUrl(video.file_url);

      return {
        success: true,
        downloadUrl: originalUrl,
        usage: updatedUsage || undefined,
        alreadyDownloaded
      };
    } catch (error) {
      console.error('ダウンロード実行エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ダウンロードに失敗しました'
      };
    }
  }

  /**
   * プラン変更時のダウンロード制限更新
   */
  static async updateDownloadLimitOnPlanChange(
    userId: string,
    newPlanId: string,
    previousPlanId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const newPlan = getPlanById(newPlanId);
      if (!newPlan) {
        return {
          success: false,
          error: '無効なプランIDです'
        };
      }

      // 現在のダウンロード使用状況を取得
      const currentUsage = await this.getUserDownloadUsage(userId);
      if (!currentUsage) {
        return {
          success: false,
          error: '現在の使用状況を取得できません'
        };
      }

      // プランアップグレードの場合は即座に制限を更新
      // プランダウングレードの場合は次回請求サイクルから適用
      const isUpgrade = this.isUpgrade(previousPlanId, newPlanId);
      
      if (isUpgrade) {
        // アップグレード時は即座に制限を更新
        await this.logPlanChange(userId, newPlanId, previousPlanId, 'immediate');
      } else {
        // ダウングレード時は次回請求サイクルから適用
        await this.logPlanChange(userId, newPlanId, previousPlanId, 'next_cycle');
      }

      return { success: true };
    } catch (error) {
      console.error('プラン変更時のダウンロード制限更新エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '制限更新に失敗しました'
      };
    }
  }

  /**
   * プランアップグレード判定
   */
  private static isUpgrade(previousPlanId: string | undefined, newPlanId: string): boolean {
    const planOrder = ['free', 'standard', 'pro', 'business', 'enterprise'];
    const previousIndex = previousPlanId ? planOrder.indexOf(previousPlanId) : -1;
    const newIndex = planOrder.indexOf(newPlanId);
    
    return newIndex > previousIndex;
  }

  /**
   * プラン変更ログの記録
   */
  private static async logPlanChange(
    userId: string,
    newPlanId: string,
    previousPlanId: string | undefined,
    effectiveDate: 'immediate' | 'next_cycle'
  ): Promise<void> {
    try {
      await supabase
        .from('plan_change_history')
        .insert({
          user_id: userId,
          previous_plan_id: previousPlanId,
          new_plan_id: newPlanId,
          effective_date: effectiveDate,
          changed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('プラン変更ログ記録エラー:', error);
    }
  }

  /**
   * ダウンロード制限の警告メッセージを生成
   */
  static generateWarningMessage(usage: DownloadUsage): string | null {
    const usageRatio = usage.currentUsage / usage.monthlyLimit;
    
    if (usage.isLimitExceeded) {
      return `月間ダウンロード制限（${usage.monthlyLimit}本）に達しています。次回リセット: ${usage.resetDate.toLocaleDateString()}`;
    }
    
    if (usageRatio >= 0.9) {
      return `月間ダウンロード制限まで残り${usage.remaining}本です。制限を超えると翌月まで待つ必要があります。`;
    }
    
    if (usageRatio >= 0.7) {
      return `月間ダウンロード制限の70%を使用しています。残り${usage.remaining}本です。`;
    }
    
    if (usageRatio >= 0.5) {
      return `月間ダウンロード制限の50%を使用しています。残り${usage.remaining}本です。`;
    }
    
    return null;
  }

  /**
   * ダウンロード制限の統計情報を取得
   */
  static async getDownloadStatistics(userId: string): Promise<{
    totalDownloads: number;
    thisMonthDownloads: number;
    mostDownloadedCategory: string;
    avgDownloadsPerMonth: number;
  } | null> {
    try {
      const limitConfig = await this.getUserDownloadLimit(userId);
      if (!limitConfig) {
        return null;
      }

      // 現在の請求サイクルの開始日を計算
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const resetDay = Math.min(limitConfig.resetDay, new Date(currentYear, currentMonth + 1, 0).getDate());
      
      let cycleStart: Date;
      if (now.getDate() >= resetDay) {
        cycleStart = new Date(currentYear, currentMonth, resetDay);
      } else {
        cycleStart = new Date(currentYear, currentMonth - 1, resetDay);
      }

      // 統計情報を取得
      const { data: downloads, error } = await supabase
        .from('download_history')
        .select(`
          id,
          downloaded_at,
          video_assets (
            category
          )
        `)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const totalDownloads = downloads?.length || 0;
      const thisMonthDownloads = downloads?.filter(d => 
        new Date(d.downloaded_at) >= cycleStart
      ).length || 0;

      // カテゴリ別ダウンロード数の集計
      const categoryCount: { [key: string]: number } = {};
      downloads?.forEach(download => {
        const category = (download.video_assets as any)?.category || 'unknown';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const mostDownloadedCategory = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';

      // 平均ダウンロード数（過去3ヶ月分）
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentDownloads = downloads?.filter(d => 
        new Date(d.downloaded_at) >= threeMonthsAgo
      ).length || 0;
      
      const avgDownloadsPerMonth = Math.round(recentDownloads / 3);

      return {
        totalDownloads,
        thisMonthDownloads,
        mostDownloadedCategory,
        avgDownloadsPerMonth
      };
    } catch (error) {
      console.error('ダウンロード統計取得エラー:', error);
      return null;
    }
  }
}

/**
 * React Hook for download limits
 */
export const useDownloadLimits = (userId: string) => {
  const [usage, setUsage] = React.useState<DownloadUsage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadedVideoIds, setDownloadedVideoIds] = React.useState<Set<string>>(new Set());

  const refreshUsage = React.useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // サーバーAPI経由でダウンロード済み動画IDリストを取得（RLSをバイパス）
      try {
        const listResp = await fetch(`/api/download-history?userId=${userId}&action=list`);
        const listResult = await listResp.json();
        console.log('[useDownloadLimits] list API result:', listResult);
        if (listResult.videoIds) {
          setDownloadedVideoIds(new Set(listResult.videoIds));
        }
      } catch (apiError) {
        console.warn('[useDownloadLimits] list API error, falling back to direct query:', apiError);
        // フォールバック: 直接Supabaseクエリ（RLSにブロックされる可能性あり）
        const { data: downloads } = await supabase
          .from('download_history')
          .select('video_id')
          .eq('user_id', userId);

        if (downloads) {
          setDownloadedVideoIds(new Set(downloads.map((d: { video_id: string }) => d.video_id)));
        }
      }

      const usageData = await DownloadLimitManager.getUserDownloadUsage(userId);
      setUsage(usageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  React.useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const isVideoDownloaded = React.useCallback((videoId: string) => {
    return downloadedVideoIds.has(videoId);
  }, [downloadedVideoIds]);

  const checkDownload = React.useCallback(async (videoId: string) => {
    if (!userId) return { allowed: false, reason: 'ユーザーが認証されていません' };

    return await DownloadLimitManager.checkDownloadPermission(userId, videoId);
  }, [userId]);

  const executeDownload = React.useCallback(async (videoId: string) => {
    console.log('[useDownloadLimits] executeDownload called, userId:', userId, 'videoId:', videoId);
    if (!userId) {
      console.log('[useDownloadLimits] userId is empty, returning early');
      return { success: false, error: 'ユーザーが認証されていません' };
    }

    console.log('[useDownloadLimits] calling DownloadLimitManager.executeDownload');
    const result = await DownloadLimitManager.executeDownload(userId, videoId);

    if (result.success) {
      // alreadyDownloadedがfalse（初回ダウンロード）の場合のみローカルSetに追加
      if (!result.alreadyDownloaded) {
        setDownloadedVideoIds(prev => new Set(prev).add(videoId));
      }
      if (result.usage) {
        setUsage(result.usage);
      }
    }

    return result;
  }, [userId]);

  const warningMessage = usage ? DownloadLimitManager.generateWarningMessage(usage) : null;

  return {
    usage,
    loading,
    error,
    refreshUsage,
    checkDownload,
    executeDownload,
    warningMessage,
    downloadedVideoIds,
    isVideoDownloaded
  };
};

// React import for the hook
import React from 'react';
