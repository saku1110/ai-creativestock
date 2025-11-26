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
  recordDownload: () => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data?: UserProfile | null; error?: unknown }>;
  refreshUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

let lastAuthLogStatus: 'Authenticated' | 'Not authenticated' | null = null;

interface UserProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

export const UserProvider = ({ children, initialUser }: UserProviderProps) => {
  console.log(`${LOG_TAG} provider render`, { hasInitialUser: !!initialUser });
  const [user, setUser] = useState<User | null>(initialUser ?? null);
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
    const loadingTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 12000);

    const fetchUserData = async (providedUser?: User | null) => {
      console.log(`${LOG_TAG} fetchUserData start`, { providedUser: providedUser?.id });
      try {
        let effectiveUser: User | null = providedUser ?? null;
        let accessToken: string | null = null;

        // initialUser が渡されている場合は getSession() をスキップ
        if (!effectiveUser) {
          console.log(`${LOG_TAG} before getSession`, { supabaseAuth: !!supabase?.auth });
          console.log(`${LOG_TAG} auth.getSession start`);
          try {
            // timeout付きで getSession を叩く（ハング防止）
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
              setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 6000)
            );
            const { data: sessionData, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]);

            if (sessionError && sessionError.message !== 'timeout') {
              console.warn(`${LOG_TAG} auth.getSession error`, sessionError);
            }
            if (sessionError?.message === 'timeout') {
              console.warn(`${LOG_TAG} auth.getSession timed out after 6s`);
            }

            effectiveUser = sessionData?.session?.user ?? null;
            accessToken = sessionData?.session?.access_token ?? null;
            console.log(`${LOG_TAG} auth.getSession result`, effectiveUser?.id || 'no user');
          } catch (sessionErr) {
            console.error(`${LOG_TAG} auth.getSession exception`, sessionErr);
          }

          // Fallback: try getCurrentUser when session is missing
          if (!effectiveUser) {
            console.log(`${LOG_TAG} auth.getCurrentUser start`);
            const { user: currentUser, error: currentUserError } = await auth.getCurrentUser();
            if (currentUserError) {
              console.warn(`${LOG_TAG} auth.getCurrentUser error`, currentUserError);
            }
            console.log(`${LOG_TAG} auth.getCurrentUser result`, currentUser);
            effectiveUser = currentUser ?? null;
          }

          // Final fallback: try to recover user/access token from localStorage (Supabase stores auth-token there)
          if (!effectiveUser && typeof localStorage !== 'undefined') {
            try {
              const tokenKey = Object.keys(localStorage).find((k) => k.includes('auth-token'));
              if (tokenKey) {
                const parsed = JSON.parse(localStorage.getItem(tokenKey) || '{}');
                const session = parsed.currentSession || parsed;
                if (session?.user) {
                  effectiveUser = session.user as User;
                  accessToken = session.access_token || accessToken;
                  console.log(`${LOG_TAG} recovered user from localStorage token`, effectiveUser.id);
                }
              }
            } catch (e) {
              console.warn(`${LOG_TAG} localStorage token parse failed`, e);
            }
          }
        } else {
          console.log(`${LOG_TAG} using provided user, skipping getSession`, effectiveUser.id);
        }

        if (import.meta.env.DEV) {
          const status = effectiveUser ? 'Authenticated' : 'Not authenticated';
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

        // 並列でデータ取得（パフォーマンス向上）
        console.log(`${LOG_TAG} fetching profile, subscription, downloads in parallel`, effectiveUser.id);

        // Profile取得関数
        const fetchProfile = async () => {
          console.log(`${LOG_TAG} getUserProfile start`, effectiveUser!.id);
          try {
            const profilePromise = database.getUserProfile(effectiveUser!.id);
            const profileTimeout = new Promise<{ data: null; error: { message: string } }>((resolve) =>
              setTimeout(() => {
                console.warn(`${LOG_TAG} getUserProfile timeout after 5s`);
                resolve({ data: null, error: { message: 'timeout' } });
              }, 5000)
            );
            const { data: profileData, error: profileError } = await Promise.race([profilePromise, profileTimeout]);
            console.log(`${LOG_TAG} getUserProfile result`, { data: profileData?.id, error: profileError });
            if (profileError && profileError.message !== 'timeout') {
              console.warn(`${LOG_TAG} getUserProfile error`, profileError);
            }

            if (profileError && (profileError as any)?.code === 'PGRST116') {
              const { data: newProfile, error: createError } = await database.updateUserProfile(effectiveUser!.id, {
                email: effectiveUser!.email,
                name: effectiveUser!.user_metadata?.full_name || effectiveUser!.email?.split('@')[0] || 'ゲストユーザー',
                avatar_url: effectiveUser!.user_metadata?.avatar_url
              });
              return newProfile;
            }
            return profileData;
          } catch (profileErr) {
            console.error(`${LOG_TAG} getUserProfile exception`, profileErr);
            return null;
          }
        };

        // Subscription取得関数
        const fetchSubscription = async () => {
          console.log(`${LOG_TAG} getUserSubscription start`, effectiveUser!.id);
          try {
            // Prefer server-side API (service role) so RLSに左右されない
            const tryServerApi = async (): Promise<UserSubscription | null> => {
              try {
                const params = new URLSearchParams();
                params.set('userId', effectiveUser!.id);
                const headers: Record<string, string> = {};
                if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

                // タイムアウト付きでfetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);

                const resp = await fetch(`/api/subscription-info?${params.toString()}`, {
                  headers,
                  signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!resp.ok) {
                  console.warn('[useUser] subscription-info api failed', resp.status);
                  return null;
                }
                const json = await resp.json();
                console.log('[useUser] subscription-info api result', json.subscription);
                return json.subscription ?? null;
              } catch (e) {
                if ((e as Error).name === 'AbortError') {
                  console.warn('[useUser] subscription-info api timeout');
                } else {
                  console.warn('[useUser] subscription-info api exception', e);
                }
                return null;
              }
            };

            let subscriptionData = await tryServerApi();
            console.log('[useUser] tryServerApi result:', subscriptionData);

            // Fallback to Supabase client if API not available or no token
            if (!subscriptionData) {
              console.log('[useUser] API returned null, trying Supabase client fallback');
              const subscriptionResult = await database.getUserSubscription(effectiveUser!.id);
              subscriptionData = subscriptionResult?.data ?? null;
              console.log('[useUser] subscriptionResult via supabase', {
                data: subscriptionResult?.data,
                error: subscriptionResult?.error
              });
            }

            console.log('[useUser] final subscriptionData:', subscriptionData);
            return subscriptionData;
          } catch (subErr) {
            console.error(`${LOG_TAG} getUserSubscription exception`, subErr);
            return null;
          }
        };

        // ダウンロード数取得関数（タイムアウト付き）
        const fetchDownloadCount = async () => {
          console.log(`${LOG_TAG} getMonthlyDownloadCount start`, effectiveUser!.id);
          try {
            const countPromise = database.getMonthlyDownloadCount(effectiveUser!.id);
            const countTimeout = new Promise<{ count: number }>((resolve) =>
              setTimeout(() => {
                console.warn(`${LOG_TAG} getMonthlyDownloadCount timeout after 5s`);
                resolve({ count: 0 });
              }, 5000)
            );
            const { count } = await Promise.race([countPromise, countTimeout]);
            console.log(`${LOG_TAG} getMonthlyDownloadCount result`, count);
            return count;
          } catch (monthlyErr) {
            console.error(`${LOG_TAG} getMonthlyDownloadCount exception`, monthlyErr);
            return 0;
          }
        };

        // 並列実行
        const [profileData, subscriptionData, downloadCount] = await Promise.all([
          fetchProfile(),
          fetchSubscription(),
          fetchDownloadCount()
        ]);

        console.log(`${LOG_TAG} parallel fetch complete`, { profileData: !!profileData, subscriptionData: !!subscriptionData, downloadCount });

        if (isMounted) {
          if (profileData) setProfile(profileData);
          setSubscription(resolveTestSubscription(subscriptionData));
          if (typeof downloadCount === 'number') {
            setMonthlyDownloads((prev) => Math.max(prev, downloadCount));
          }
        }
      } catch (error) {
        console.error(`${LOG_TAG} user data fetch error`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // initialUser が渡されている場合はそれを使用
    fetchUserData(initialUser ?? undefined);

    let authSubscription: { unsubscribe: () => void } | undefined;
    const { data: { subscription: authSub } } = auth.onAuthStateChange(async (event, session) => {
      const sessionData = session as { user?: User | null } | null;
      if (event === 'SIGNED_IN' && sessionData?.user) {
        setUser(sessionData.user);
        await fetchUserData(sessionData.user);
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
  }, [initialUser]);

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
        // サーバーAPIを使用（RLSをバイパス）
        const params = new URLSearchParams();
        params.set('userId', user.id);
        const resp = await fetch(`/api/subscription-info?${params.toString()}`);
        if (resp.ok) {
          const json = await resp.json();
          console.log('[useUser] syncSubscription via server API', json.subscription);
          if (isActive) {
            setSubscription(resolveTestSubscription(json.subscription ?? null));
          }
        } else {
          // フォールバック: Supabaseクライアントを使用
          console.warn('[useUser] syncSubscription server API failed, using fallback');
          const { data } = await database.getUserSubscription(user.id);
          if (isActive) {
            setSubscription(resolveTestSubscription(data));
          }
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
    (
      !subscription.current_period_end ||  // nullの場合はstatusのみで判定
      new Date(subscription.current_period_end) > new Date()
    )
  );

  // デバッグログ: hasActiveSubscription の計算値
  console.log('[useUser] hasActiveSubscription debug:', {
    subscription: subscription ? {
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      monthly_download_limit: subscription.monthly_download_limit
    } : null,
    statusCheck: subscription ? (subscription.status === 'active' || subscription.status === 'trial') : false,
    periodCheck: subscription ? new Date(subscription.current_period_end) > new Date() : false,
    hasActiveSubscription
  });

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
