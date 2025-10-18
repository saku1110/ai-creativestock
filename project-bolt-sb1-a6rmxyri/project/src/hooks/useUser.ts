import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { auth, database } from '../lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface UserSubscription {
  id: string;
  plan: 'standard' | 'pro' | 'enterprise';
  status: 'trial' | 'active' | 'canceled' | 'past_due' | 'unpaid';
  current_period_end: string;
  monthly_download_limit: number;
  trial_end_date?: string;
  trial_downloads_used?: number;
  trial_downloads_limit?: number;
  auto_charge_date?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [monthlyDownloads, setMonthlyDownloads] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // セキュリティ修正: 開発環境でもSupabaseの認証チェックを必須に
        // if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        //   // 削除: 認証バイパスは完全に削除
        // }

        // 現在のユーザーを取得（全環境で統一）
        const { user: currentUser } = await auth.getCurrentUser();
        
        // 開発環境では追加のログ出力（デバッグ用）
        if (import.meta.env.DEV) {
          console.log('User authentication check:', currentUser ? 'Authenticated' : 'Not authenticated');
        }
        
        if (!currentUser) {
          setLoading(false);
          return;
        }

        setUser(currentUser);

        // プロフィール情報を取得
        const { data: profileData, error: profileError } = await database.getUserProfile(currentUser.id);
        
        // プロフィールが存在しない場合は作成
        if (profileError && profileError.code === 'PGRST116') {
          // プロフィールを作成
          const { data: newProfile, error: createError } = await database.updateUserProfile(currentUser.id, {
            email: currentUser.email,
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'ユーザー',
            avatar_url: currentUser.user_metadata?.avatar_url
          });
          
          if (!createError && newProfile) {
            setProfile(newProfile);
          }
        } else if (profileData) {
          setProfile(profileData);
        }

        // サブスクリプション情報を取得
        const { data: subscriptionData } = await database.getUserSubscription(currentUser.id);
        setSubscription(subscriptionData);

        // 月間ダウンロード数を取得
        const { count } = await database.getMonthlyDownloadCount(currentUser.id);
        setMonthlyDownloads(count);

      } catch (error) {
        console.error('ユーザーデータの取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // 認証状態の変更を監視（開発環境では無効化）
    let authSubscription: any;
    if (!(import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development')) {
      const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          fetchUserData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setMonthlyDownloads(0);
          setLoading(false);
        }
      });
      authSubscription = subscription;
    }

    return () => {
      authSubscription?.unsubscribe();
    };
  }, []);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'ユーザーがログインしていません' };

    try {
      const { data, error } = await database.updateUserProfile(user.id, updates);
      if (!error && data) {
        setProfile(data);
      }
      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      // プロフィール情報を再取得
      const { data: profileData } = await database.getUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }

      // サブスクリプション情報を再取得
      const { data: subscriptionData } = await database.getUserSubscription(user.id);
      setSubscription(subscriptionData);

      // 月間ダウンロード数を再取得
      const { count } = await database.getMonthlyDownloadCount(user.id);
      setMonthlyDownloads(count);
    } catch (error) {
      console.error('ユーザーデータの再取得エラー:', error);
    }
  };

  const remainingDownloads = subscription 
    ? Math.max(0, subscription.monthly_download_limit - monthlyDownloads)
    : 0;

  const hasActiveSubscription = subscription && 
    (subscription.status === 'active' || subscription.status === 'trial') && 
    new Date(subscription.current_period_end) > new Date();

  const isTrialUser = subscription && subscription.status === 'trial';
  const trialDaysRemaining = subscription?.trial_end_date ? 
    Math.max(0, Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const trialDownloadsRemaining = subscription?.trial_downloads_limit && subscription?.trial_downloads_used ? 
    Math.max(0, subscription.trial_downloads_limit - subscription.trial_downloads_used) : 0;

  return {
    user,
    profile,
    subscription,
    monthlyDownloads,
    remainingDownloads,
    hasActiveSubscription,
    isTrialUser,
    trialDaysRemaining,
    trialDownloadsRemaining,
    loading,
    updateProfile,
    refreshUserData
  };
};