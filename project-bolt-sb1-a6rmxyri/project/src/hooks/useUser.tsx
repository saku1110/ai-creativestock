import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { auth, database, supabase } from '../lib/supabase';
import { subscriptionPlans } from '../lib/stripe';

const LOG_TAG = '[useUser]';
console.log(`${LOG_TAG} module loaded`);

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
  plan: 'standard' | 'pro' | 'business' | 'enterprise';
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

interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
  subscription: UserSubscription | null;
  monthlyDownloads: number;
  monthlyDownloadLimit: number;
  remainingDownloads: number;
  hasActiveSubscription: boolean;
  isTrialUser: boolean;
  trialDaysRemaining: number;
  trialDownloadsRemaining: number;
  loading: boolean;
  // Record a download locally to keep UI in sync while server updates propagate
  recordDownload: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data?: UserProfile | null; error?: unknown }>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

let lastAuthLogStatus: 'Authenticated' | 'Not authenticated' | null = null;

export const UserProvider = ({ children }: { children: ReactNode }) => {
  console.log(`${LOG_TAG} provider render`);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [monthlyDownloads, setMonthlyDownloads] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const isTestEnv =
    import.meta.env.DEV ||
    import.meta.env.VITE_APP_ENV === 'test' ||
    import.meta.env.MODE === 'test';
  const forceTestStandardPlan =
    isTestEnv ||
    String(import.meta.env.VITE_FORCE_TEST_STANDARD_PLAN ?? '').toLowerCase() === 'true';

  const resolvePlanLimit = (sub: UserSubscription | null) => {
    if (!sub) return 0;
    const plan = subscriptionPlans.find((p) => p.id === (sub.plan as any));
    const planDefault = plan?.monthlyDownloads ?? 0;
    if (sub.monthly_download_limit) {
      return Math.min(sub.monthly_download_limit, planDefault || sub.monthly_download_limit);
    }
    return planDefault;
  };

  const resolveTestSubscription = (data: UserSubscription | null | undefined): UserSubscription | null => {
    if (data) return data;
    if (!forceTestStandardPlan) return null;

    const standardPlan = subscriptionPlans.find((plan) => plan.id === 'standard');
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    return {
      id: 'test-standard-subscription',
      plan: 'standard',
      status: 'active',
      current_period_end: periodEnd.toISOString(),
      monthly_download_limit: standardPlan?.monthlyDownloads ?? 20,
      trial_end_date: undefined,
      trial_downloads_used: 0,
      trial_downloads_limit: 0,
      auto_charge_date: periodEnd.toISOString(),
      stripe_customer_id: 'test_customer',
      stripe_subscription_id: 'test_subscription_id'
    };
  };

  useEffect(() => {
    let isMounted = true;
    // Fail-safe: loading解除が何らかの理由で実行されない場合に備える
    const loadingTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 12000);

    const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T | null> => {
      let timeoutHandle: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          console.warn(`[useUser] ${label} timed out after ${ms}ms`);
          resolve(null);
        }, ms);
      });

      try {
        const result = await Promise.race([promise, timeoutPromise]);
        return result as T | null;
      } finally {
        clearTimeout(timeoutHandle!);
      }
    };

    const fetchUserData = async () => {
      console.log(`${LOG_TAG} fetchUserData start`);
      try {
        console.log(`${LOG_TAG} auth.getCurrentUser start`);
        const { user: currentUser, error: currentUserError } = await auth.getCurrentUser();
        if (currentUserError) {
          console.warn(`${LOG_TAG} auth.getCurrentUser error`, currentUserError);
        }
        console.log(`${LOG_TAG} auth.getCurrentUser result`, currentUser);

        // Fallback: getSession が取れるならそこから user を採用
        let effectiveUser = currentUser;
        if (!effectiveUser) {
          try {
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
              console.warn(`${LOG_TAG} auth.getSession error`, sessionError);
            }
            effectiveUser = sessionData?.session?.user ?? null;
            console.log(`${LOG_TAG} auth.getSession result`, effectiveUser);
          } catch (sessionErr) {
            console.error(`${LOG_TAG} auth.getSession exception`, sessionErr);
          }
        }

        if (import.meta.env.DEV) {
          const status = currentUser ? 'Authenticated' : 'Not authenticated';
          if (lastAuthLogStatus !== status) {
            lastAuthLogStatus = status;
            console.log('User authentication check:', status);
          }
        }

        console.log('[useUser] currentUser', effectiveUser?.id);

        if (!effectiveUser || !isMounted) {
          setUser(null);
          setProfile(null);
          setSubscription(null);
          setMonthlyDownloads(0);
          setLoading(false);
          return;
        }

        setUser(effectiveUser);

        const profileResult = await withTimeout(
          database.getUserProfile(effectiveUser.id),
          6000,
          'getUserProfile'
        );
        const profileData = profileResult?.data;
        const profileError: any = profileResult?.error;

        if (profileError && profileError.code === 'PGRST116') {
          const createResult = await withTimeout(
            database.updateUserProfile(currentUser.id, {
              email: currentUser.email,
              name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'ゲストユーザー',
              avatar_url: currentUser.user_metadata?.avatar_url
            }),
            6000,
            'updateUserProfile'
          );
          const newProfile = createResult?.data;
          const createError = createResult?.error;

          if (!createError && newProfile && isMounted) {
            setProfile(newProfile);
          }
        } else if (profileData && isMounted) {
          setProfile(profileData);
        }

        console.log(`${LOG_TAG} getUserSubscription start`, currentUser.id);
        const subscriptionResult = await withTimeout(
          database.getUserSubscription(effectiveUser.id),
          6000,
          'getUserSubscription'
        );
        const subscriptionData = subscriptionResult?.data;
        console.log('[useUser] subscriptionResult', { data: subscriptionResult?.data, error: subscriptionResult?.error });
        if (isMounted) {
          setSubscription(resolveTestSubscription(subscriptionData));
        }

        const monthlyResult = await withTimeout(
          database.getMonthlyDownloadCount(currentUser.id),
          6000,
          'getMonthlyDownloadCount'
        );
        const count = monthlyResult?.count;
        if (isMounted && typeof count === 'number') {
          setMonthlyDownloads((prev) => Math.max(prev, count));
        }
      } catch (error) {
        console.error(`${LOG_TAG} user data fetch error`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUserData();

    let authSubscription: { unsubscribe: () => void } | undefined;
    const { data: { subscription: authSub } } = auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchUserData();
      } else if (event === 'SIGNED_OUT') {
        if (!isMounted) return;
        setUser(null);
        setProfile(null);
        setSubscription(null);
        setMonthlyDownloads(0);
        setLoading(false);
      }
    });
    authSubscription = authSub;

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let isActive = true;

    const syncMonthlyDownloads = async () => {
      try {
        const { count } = await database.getMonthlyDownloadCount(user.id);
        if (isActive && typeof count === 'number') {
          setMonthlyDownloads((prev) => Math.max(prev, count));
        }
      } catch (error) {
        console.error('月次ダウンロード数同期エラー:', error);
      }
    };

    const syncSubscription = async () => {
      try {
        const { data } = await database.getUserSubscription(user.id);
        if (isActive) {
          setSubscription(resolveTestSubscription(data));
        }
      } catch (error) {
        console.error('サブスクリプション同期エラー:', error);
      }
    };

    const downloadChannel = supabase
      .channel(`download-usage:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'download_history', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (!isActive) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            void syncMonthlyDownloads();
          }
        }
      )
      .subscribe();

    const subscriptionChannel = supabase
      .channel(`subscription-plan:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${user.id}` },
        () => {
          if (!isActive) return;
          void syncSubscription();
        }
      )
      .subscribe();

    return () => {
      isActive = false;
      downloadChannel?.unsubscribe?.();
      subscriptionChannel?.unsubscribe?.();
    };
  }, [user?.id]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'ユーザーが未ログインです' };

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
      const { data: profileData } = await database.getUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }

      const { data: subscriptionData } = await database.getUserSubscription(user.id);
      setSubscription(resolveTestSubscription(subscriptionData));

      const { count } = await database.getMonthlyDownloadCount(user.id);
      setMonthlyDownloads((prev) => Math.max(prev, count));
    } catch (error) {
      console.error('ユーザーデータ再取得エラー:', error);
    }
  };

  const hasActiveSubscription = Boolean(
    subscription &&
    (subscription.status === 'active' || subscription.status === 'trial') &&
    new Date(subscription.current_period_end) > new Date()
  );

  const isTrialUser = subscription?.status === 'trial' || false;

  const trialDaysRemaining = subscription?.trial_end_date
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const trialDownloadsRemaining = subscription?.trial_downloads_limit && subscription?.trial_downloads_used
    ? Math.max(0, subscription.trial_downloads_limit - subscription.trial_downloads_used)
    : 0;

  const monthlyDownloadLimit = subscription ? resolvePlanLimit(subscription) : 0;

  const remainingDownloads = subscription
    ? Math.max(0, monthlyDownloadLimit - monthlyDownloads)
    : 0;

  const recordDownload = () => {
    setMonthlyDownloads((prev) => prev + 1);
  };

  const contextValue: UserContextValue = {
    user,
    profile,
    subscription,
    monthlyDownloads,
    monthlyDownloadLimit,
    remainingDownloads,
    hasActiveSubscription,
    isTrialUser,
    trialDaysRemaining,
    trialDownloadsRemaining,
    loading,
    recordDownload,
    updateProfile,
    refreshUserData
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
