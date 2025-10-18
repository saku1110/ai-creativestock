// ダウンロード制限管理システム
import { supabase } from './supabase';
import { subscriptionPlans, getPlanById } from './stripe';

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
      // ユーザーのサブスクリプション情報を取得
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('plan_id, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error || !subscription) {
        // サブスクリプションがない場合はフリープラン扱い
        return {
          planId: 'free',
          monthlyLimit: 3, // フリープランは月3回まで
          resetDay: 1,
          gracePeriod: 0
        };
      }

      const plan = getPlanById(subscription.plan_id);
      if (!plan) {
        return null;
      }

      return {
        planId: subscription.plan_id,
        monthlyLimit: plan.monthlyDownloads,
        resetDay: new Date(subscription.created_at).getDate(),
        gracePeriod: subscription.plan_id === 'enterprise' ? 5 : 2
      };
    } catch (error) {
      console.error('ダウンロード制限取得エラー:', error);
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

      // 現在の請求サイクルでのダウンロード数を取得
      const { data: downloads, error } = await supabase
        .from('download_history')
        .select('id')
        .eq('user_id', userId)
        .gte('downloaded_at', cycleStart.toISOString())
        .lte('downloaded_at', now.toISOString());

      if (error) {
        throw error;
      }

      const currentUsage = downloads?.length || 0;
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

      // ダウンロード履歴を記録
      const { error: historyError } = await supabase
        .from('download_history')
        .insert({
          user_id: userId,
          video_id: videoId,
          downloaded_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('ダウンロード履歴記録エラー:', historyError);
        return {
          success: false,
          error: 'ダウンロード履歴の記録に失敗しました'
        };
      }

      // 動画のダウンロード数を更新
      const { error: updateError } = await supabase
        .from('video_assets')
        .update({
          download_count: supabase.rpc('increment', { x: 1 })
        })
        .eq('id', videoId);

      if (updateError) {
        console.error('ダウンロード数更新エラー:', updateError);
      }

      // 更新後の使用状況を取得
      const updatedUsage = await this.getUserDownloadUsage(userId);

      return {
        success: true,
        downloadUrl: video.file_url,
        usage: updatedUsage || undefined
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
    const planOrder = ['free', 'standard', 'pro', 'enterprise'];
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

  const refreshUsage = React.useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
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

  const checkDownload = React.useCallback(async (videoId: string) => {
    if (!userId) return { allowed: false, reason: 'ユーザーが認証されていません' };
    
    return await DownloadLimitManager.checkDownloadPermission(userId, videoId);
  }, [userId]);

  const executeDownload = React.useCallback(async (videoId: string) => {
    if (!userId) return { success: false, error: 'ユーザーが認証されていません' };
    
    const result = await DownloadLimitManager.executeDownload(userId, videoId);
    
    if (result.success && result.usage) {
      setUsage(result.usage);
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
    warningMessage
  };
};

// React import for the hook
import React from 'react';