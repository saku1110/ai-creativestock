import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/Header';
import Hero from './components/Hero';
import ProblemMetrics from './components/ProblemMetrics';
import VideoGallery from './components/VideoGallery';
import SolutionFeatures from './components/SolutionFeatures';
import EfficiencyStats from './components/EfficiencyStats';
import ComparisonTable from './components/ComparisonTable';
import TestPricing from './components/TestPricing';
import CustomerReviews from './components/CustomerReviews';
import VideoRequestSection from './components/VideoRequestSection';
import TestFAQ from './components/TestFAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';
import RefundPolicy from './components/RefundPolicy';
import CommercialTransaction from './components/CommercialTransaction';
import Contact from './components/Contact';
import Dashboard from './components/Dashboard';
import MyPage from './components/MyPage';
import AdminUpload from './components/AdminUpload';
import AdminStagingReview from './components/AdminStagingReview';
import AutoUpload from './components/AutoUpload';
import AuthModal from './components/AuthModal';
import ContactModal from './components/ContactModal';
import PricingPage from './components/PricingPage';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCancel from './components/PaymentCancel';
import PaymentHistory from './components/PaymentHistory';
import DownloadHistory from './components/DownloadHistory';
import UserFavorites from './components/UserFavorites';
import SubscriptionTestPanel from './components/SubscriptionTestPanel';
import SEOHead from './components/SEOHead';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorToast from './components/ErrorToast';
import Breadcrumbs from './components/Breadcrumbs';
import SimpleLandingPage from './components/simple/SimpleLandingPage';
import WhiteLandingPage from './components/WhiteLandingPage';
import { auth, database, supabase } from './lib/supabase';
import { useErrorHandler } from './hooks/useErrorHandler';
import { pageSEOData, getPageType } from './utils/seoUtils';
import { User } from '@supabase/supabase-js';

function App() {
  // URL縺ｨ繧ｯ繧ｨ繝ｪ縺九ｉ蛻晄悄繝壹・繧ｸ繧貞愛螳夲ｼ・contact 遲峨・繝代せ蜆ｪ蜈茨ｼ・
  const urlParams = new URLSearchParams(window.location.search);
  const pathSegment = (typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0]
    : '') || '';
  const PATH_PAGES = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'];
  const initialVariant = (PATH_PAGES.includes(pathSegment)
    ? pathSegment
    : (urlParams.get('variant') || 'landing'));
  const REGISTRATION_RECENT_MS = 10 * 60 * 1000;
  const isDevEnv = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
  const LOADER_FAILSAFE_MS = 12000;

  // Public pages that don't require authentication
  const PUBLIC_PAGES = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'];
  const isPublicPage = (page?: string | null) => {
    if (!page) {
      return true;
    }
    return PUBLIC_PAGES.includes(page);
  };

  const [currentPage, setCurrentPage] = useState(initialVariant);
  const currentPageRef = useRef(currentPage);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [showContactModal, setShowContactModal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidAuthProvider, setIsValidAuthProvider] = useState(false);
  const [isNewUserRegistration, setIsNewUserRegistration] = useState(false);
  const isNewUserRegistrationRef = useRef(false); // 蜷梧悄繝輔Λ繧ｰ邂｡逅・畑
  const initialAuthModeRef = useRef<string | null>(null);
  const postRegistrationHandledRef = useRef(false);
  const { errors, removeError, clearErrors, handleApiError } = useErrorHandler();

  const clearSupabaseStorage = () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase'))
        .forEach((key) => localStorage.removeItem(key));
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase'))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch (error) {
      console.warn('supabase storage clear skipped', error);
    }
  };

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // 繝壹・繧ｸ驕ｷ遘ｻ譎ゅ↓譛荳企Κ縺ｫ繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  // Fail-safe to prevent getting stuck on the loading screen
  useEffect(() => {
    const failsafe = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn('Auth initialization fallback triggered - forcing loading off.');
        }
        return false;
      });
    }, LOADER_FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !isPublicPage(currentPage)) {
      setCurrentPage('landing');
    }
  }, [isLoggedIn, currentPage]);

  // 隱崎ｨｼ繝励Ο繝舌う繝繝ｼ繝√ぉ繝・け髢｢謨ｰ
  const checkAuthProvider = (user: User): boolean => {
    // 髢狗匱迺ｰ蠅・〒縺ｯ繝｢繝・け繝ｦ繝ｼ繧ｶ繝ｼ繧定ｨｱ蜿ｯ
    if (isDevEnv) {
      return true;
    }

    // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隱崎ｨｼ繝励Ο繝舌う繝繝ｼ繧偵メ繧ｧ繝・け
    const authProvider = user.app_metadata?.provider;
    const validProviders = ['google', 'email', 'apple'];
    
    console.log('Auth provider check:', { 
      provider: authProvider, 
      email: user.email,
      userId: user.id 
    });
    
    return validProviders.includes(authProvider);
  };

  const fetchProfileRecord = async (userId: string) => {
    try {
      const query = supabase
        .from('profiles')
        .select('id, created_at, email, name')
        .eq('id', userId) as any;
      const { data, error } = query?.maybeSingle
        ? await query.maybeSingle()
        : await query.single();
      if (error) {
        console.error('profiles fetch error:', error);
      }
      return data || null;
    } catch (error) {
      console.error('profiles fetch exception:', error);
      return null;
    }
  };

  const upsertProfileRecord = async (user: User) => {
    if (!user?.id) return null;
    try {
      const fallbackName = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || '').toString().trim();
      const name = fallbackName || 'New user';
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })
        .select()
        .maybeSingle?.() ?? { data: null, error: null };

      if (error) {
        console.error('Profile upsert failed:', error);
      }
      return data || null;
    } catch (error) {
      console.error('Profile upsert exception:', error);
      return null;
    }
  };

  const ensureProfile = async (user: User) => {
    // 既存プロファイルを取り、なければ作成を試みる
    const existing = await fetchProfileRecord(user.id);
    if (existing?.id) return existing;
    return await upsertProfileRecord(user);
  };

  const wasCreatedRecently = (user?: User | null) => {
    if (!user?.created_at) return false;
    const createdAtMs = new Date(user.created_at).getTime();
    if (Number.isNaN(createdAtMs)) return false;
    const diff = Date.now() - createdAtMs;
    return diff >= 0 && diff < REGISTRATION_RECENT_MS;
  };

  const isFirstTimeSession = (params: { modeHint?: string | null, user: User | null, profile: any }) => {
    const { modeHint, user, profile } = params;
    if (!user) return false;
    const hasProfile = !!profile?.id;
    const modeIsRegistration = modeHint === 'registration';
    const createdRecently = wasCreatedRecently(user);

    // プロファイルが取れなかった場合は「登録直後モード」のときだけ初回扱いにする
    if (!hasProfile) {
      return modeIsRegistration || createdRecently;
    }

    if (modeIsRegistration && createdRecently) return true;
    if (createdRecently && !postRegistrationHandledRef.current) return true;
    return false;
  };

  const runPostRegistrationSideEffects = async (user: User) => {
    if (!user?.id) return;
    if (postRegistrationHandledRef.current) return;
    if (isDevEnv) return;

    postRegistrationHandledRef.current = true;
    try {
      const fallbackName = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || '').toString().trim();
      const name = fallbackName || 'New user';
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Profile creation failed:', profileError);
      }
    } catch (error) {
      console.error('Profile creation error:', error);
    }

    try {
      await supabase?.functions?.invoke?.('post-registration-setup', {
        body: { userId: user.id, email: user.email }
      });
    } catch (error) {
      console.warn('post-registration-setup skipped', error);
    }

    try {
      await supabase?.functions?.invoke?.('send-welcome-email', {
        body: { userId: user.id, email: user.email }
      });
    } catch (error) {
      console.warn('send-welcome-email skipped', error);
    }

    try {
      await supabase?.functions?.invoke?.('grant-trial-plan', {
        body: { userId: user.id }
      });
    } catch (error) {
      console.warn('grant-trial-plan skipped', error);
    }
  };

  const handleAuthenticatedSession = async (user: User | null, options: { modeHint?: string | null } = {}) => {
    const modeHint = options.modeHint ?? initialAuthModeRef.current;

    if (!user) {
      setUserData(null);
      setIsLoggedIn(false);
      setIsValidAuthProvider(false);
      isNewUserRegistrationRef.current = false;
      setIsNewUserRegistration(false);
      const activePage = currentPageRef.current;
      if (!isPublicPage(activePage)) {
        setCurrentPage('landing');
      }
      return;
    }

    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    if (!validProvider) {
      try { await auth.signOut(); } catch {}
      setCurrentPage('landing');
      const shouldNotify = !!(modeHint || initialAuthModeRef.current);
      if (shouldNotify) {
        try {
          handleApiError(
            new Error('許可されていないログイン方法です。Google / Apple / メールアドレスでログインしてください。'),
            '認証エラー'
          );
        } catch {}
      } else {
        console.warn('Unsupported auth provider detected. Session cleared.', {
          provider: user.app_metadata?.provider,
          userId: user.id,
        });
      }
      return;
    }

    setUserData(user);
    setIsLoggedIn(true);

    const activePage = currentPageRef.current;
    // 既に新規登録フラグが立っている場合は即 pricing へ
    const initialFirstLogin = isNewUserRegistrationRef.current;
    if (initialFirstLogin) {
      setCurrentPage('pricing');
    } else {
      const targetPage = !isPublicPage(activePage)
        ? activePage
        : ((activePage === 'landing' || activePage === 'pricing') ? 'dashboard' : (activePage || 'dashboard'));
      setCurrentPage(targetPage);
    }

    // プロファイル取得/作成と初回判定はバックグラウンドで実施し、UIを止めない
    void (async () => {
      let profile = null;
      try {
        profile = await ensureProfile(user);
      } catch (error) {
        console.error('profiles fetch exception:', error);
        profile = { id: user.id };
      }
      let isFirstLogin = initialFirstLogin;
      if (!isFirstLogin) {
        isFirstLogin = isFirstTimeSession({ modeHint, user, profile });
      }

      isNewUserRegistrationRef.current = isFirstLogin;
      setIsNewUserRegistration(isFirstLogin);

      if (isFirstLogin && !initialFirstLogin) {
        setCurrentPage('pricing');
        // Run post-registration tasks without blocking the UI
        void (async () => {
          try {
            await runPostRegistrationSideEffects(user);
          } catch (error) {
            console.error('post registration side effects error:', error);
          }
        })();
      }
    })();
  };
  // Auth initialization and watcher
  useEffect(() => {
    const initializeAuth = async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') ?? searchParams.get('refresh_token');
    const mode = hashParams.get('mode') ?? searchParams.get('mode');
    initialAuthModeRef.current = mode || null;

    console.log('=== auth init ===', {
      hasAccessToken: !!accessToken,
      mode,
      currentPage,
      isNewUserRegistration,
      isNewUserRef: isNewUserRegistrationRef.current,
      url: window.location.href
    });

    // 公開ページかつトークン無しならローディングを出さない
    const shouldShowLoader = !!accessToken || !isPublicPage(currentPage);
    setIsLoading(shouldShowLoader);

    let handled = false;

    try {
      if (accessToken) {
        try {
          const { data: { user }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          if (error) {
            console.error('Supabase setSession error:', error);
            throw error;
          }
          await handleAuthenticatedSession(user ?? null, { modeHint: mode });
          handled = !!user;
        } catch (error) {
          console.error('OAuth session setup error:', error);
          try { handleApiError(error, '認証エラーが発生しました'); } catch {}
        } finally {
          try { window.history.replaceState({}, document.title, window.location.pathname); } catch {}
        }
      }

      if (isDevEnv) {
        const devPath = (typeof window !== 'undefined'
          ? window.location.pathname.split('/').filter(Boolean)[0]
          : '') || '';
        const isPublicDevPath = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'].includes(devPath);
        setCurrentPage(isPublicDevPath ? devPath : 'landing');
        setIsLoggedIn(false);
        setUserData(null);
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
        postRegistrationHandledRef.current = false;
        initialAuthModeRef.current = null;
        setIsLoading(false);
        return;
      }

      if (!handled) {
        try {
          const { user } = await auth.getCurrentUser();
          await handleAuthenticatedSession(user ?? null, { modeHint: mode });
          handled = !!user;
        } catch (error) {
          console.error('Deferred auth initialization error:', error);
        }
      }

      if (!handled) {
        clearSupabaseStorage();
        setTimeout(async () => {
          try {
            const { user } = await auth.getCurrentUser();
            await handleAuthenticatedSession(user ?? null, { modeHint: mode });
          } catch (error) {
            console.error('Deferred auth initialization retry error:', error);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      const hasAuthCallbackParams =
        !!(searchParams.get('access_token') || searchParams.get('refresh_token') || searchParams.get('mode')) ||
        window.location.hash.includes('access_token');
      if (!isDevEnv && hasAuthCallbackParams) {
        handleApiError(error, '認証エラーが発生しました');
      }
      setCurrentPage('landing');
    } finally {
      // UIは非表示、認証はバックグラウンドで継続
      setIsLoading(false);
    }
  };    initializeAuth();

    // watch auth state changes
    let subscription: any;
    try {
      const { data: { subscription: authSubscription } } = auth.onAuthStateChange(
        async (_, session) => {
          console.log('=== auth state changed ===');
          try {
            await handleAuthenticatedSession(session?.user ?? null, { modeHint: initialAuthModeRef.current });
          } catch (error) {
            console.error('auth state handler error:', error);
          } finally {
            setIsLoading(false);
          }
        }
      );
      subscription = authSubscription;
      console.log('auth subscription registered');
    } catch (error) {
      console.error('auth onAuthStateChange error:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・ 隱崎ｨｼ螳御ｺ・ｾ後↓繝輔Λ繧ｰ繧貞・遒ｺ隱・
  useEffect(() => {
    if (isLoggedIn && currentPage === 'dashboard' && (isNewUserRegistration || isNewUserRegistrationRef.current)) {
      console.log('=== 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ蜃ｦ逅・ｮ溯｡・===');
      console.log('譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ縺後ム繝・す繝･繝懊・繝峨↓縺・ｋ縺溘ａ譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ菫ｮ豁｣');
      console.log('繝輔Λ繧ｰ迥ｶ諷・', { 
        isNewUserRegistration, 
        isNewUserRef: isNewUserRegistrationRef.current,
        currentPage 
      });
      setCurrentPage('pricing');
      // 繝輔Λ繧ｰ繧偵Μ繧ｻ繝・ヨ
      isNewUserRegistrationRef.current = false;
      setIsNewUserRegistration(false);
    }
  }, [isLoggedIn, currentPage, isNewUserRegistration]);


  const handlePageChange = async (page: string) => {
    // Admin-only pages require auth/role checks
    if (page === 'admin' || page === 'auto-upload') {
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('Dev env: skipping admin check');
        setCurrentPage(page);
        return;
      }

      if (!userData?.id) {
        handleApiError(new Error('ログインが必要です'), '管理ページアクセス');
        return;
      }

      try {
        const { isAdmin } = await database.checkAdminStatus(userData.id);
        if (!isAdmin) {
          handleApiError(new Error('管理者のみアクセス可能です'), '管理ページアクセス');
          return;
        }
      } catch (error) {
        handleApiError(error, 'アプリケーションエラー');
        return;
      }
    }
    setCurrentPage(page);
  };

  const handleAuthRequest = () => {
    isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
    setAuthMode('login');
    console.log('handleAuthRequest: 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleLoginRequest = () => {
    isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
    setAuthMode('login');
    console.log('handleLoginRequest: 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ繝ｭ繧ｰ繧､繝ｳ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleRegistrationRequest = () => {
    // 繝ｭ繧ｰ繧､繝ｳ縺励※縺・↑縺・ｴ蜷医・隱崎ｨｼ繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
    if (!isLoggedIn) {
      isNewUserRegistrationRef.current = true; // ref繧貞・縺ｫ險ｭ螳・
      setIsNewUserRegistration(true); // 譁ｰ隕冗匳骭ｲ縺ｪ縺ｮ縺ｧ繝輔Λ繧ｰ繧稚rue縺ｫ
      console.log('handleRegistrationRequest: 譁ｰ隕冗匳骭ｲ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
      setShowAuthModal(true);
      setAuthMode('register');
    }
    // 繝ｭ繧ｰ繧､繝ｳ貂医∩縺ｮ蝣ｴ蜷医・譁咎≡繝壹・繧ｸ縺ｸ
    setCurrentPage('pricing');
  };

  const handleContactRequest = () => {
    // 蝠上＞蜷医ｏ縺帙・繝壹・繧ｸ驕ｷ遘ｻ縺ｧ陦ｨ遉ｺ・・P縺ｫ謌ｻ繧峨↑縺・ｼ・
    setShowContactModal(false);
    setCurrentPage('contact');
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch {}
  };

  const handlePurchaseRequest = () => {
    // 繝ｭ繧ｰ繧､繝ｳ縺励※縺・↑縺・ｴ蜷医・隱崎ｨｼ繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    // 繝ｭ繧ｰ繧､繝ｳ貂医∩縺ｮ蝣ｴ蜷医・譁咎≡繝壹・繧ｸ縺ｸ
    setCurrentPage('pricing');
  };

  const handleAuthSuccess = async (user: User) => {
    const modeHint = isNewUserRegistrationRef.current ? 'registration' : (initialAuthModeRef.current || 'login');
    initialAuthModeRef.current = modeHint;
    await handleAuthenticatedSession(user, { modeHint });
    setShowAuthModal(false);

    if (isDevEnv) {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };
  const handleLogout = async () => {
    console.log('handleLogout called');
    console.log('state', { isLoggedIn, currentPage, userData: userData?.email });

    // Reset UI state first (return to landing even if signOut fails)
    setIsLoggedIn(false);
    setUserData(null);
    setIsValidAuthProvider(false);
    setCurrentPage('landing');
    isNewUserRegistrationRef.current = false;
    setIsNewUserRegistration(false);
    postRegistrationHandledRef.current = false;
    initialAuthModeRef.current = null;

    try {
      if (isDevEnv) {
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
      } else {
        await auth.signOut();
      }
    } catch (error) {
      console.error('logout error:', error);
      if (!isDevEnv) {
        try { handleApiError(error as Error, 'ログアウトに失敗しました'); } catch {}
      }
    } finally {
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase'))
          .forEach((key) => localStorage.removeItem(key));
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase'))
          .forEach((key) => sessionStorage.removeItem(key));
      } catch {}

      console.log('logout done - redirect to landing');
      try { window.location.href = '/'; } catch {}
    }
  };

const renderContent = () => {
    console.log('renderContent called:', { isLoggedIn, currentPage, isLoading });

    // Public pages accessible without login
    const publicPages = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing'];
    if (publicPages.includes(currentPage)) {
      switch (currentPage) {
        case 'terms':
          return <TermsOfService onPageChange={handlePageChange} />;
        case 'privacy':
          return <PrivacyPolicy onPageChange={handlePageChange} />;
        case 'refund':
          return <RefundPolicy onPageChange={handlePageChange} />;
        case 'commercial':
          return <CommercialTransaction onPageChange={handlePageChange} />;
        case 'contact':
          return <Contact onPageChange={handlePageChange} />;
        case 'pricing':
          return <PricingPage onPageChange={handlePageChange} />;
      }
    }

    if (!isLoggedIn) {
      // 譛ｪ繝ｭ繧ｰ繧､繝ｳ譎・ 繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ驕ｸ謚・
      if (currentPage === 'simple-landing') {
        // 繧ｷ繝ｳ繝励ΝLP繧定｡ｨ遉ｺ
        return (
          <SimpleLandingPage
            onAuthRequest={handleRegistrationRequest}
            showAuthModal={showAuthModal}
            setShowAuthModal={setShowAuthModal}
          />
        );
      } else if (currentPage === 'white-landing') {
        // 逋ｽ閭梧勹LP繧定｡ｨ遉ｺ
        return (
          <WhiteLandingPage
            onAuthRequest={handleLoginRequest}
            onTrialRequest={handleRegistrationRequest}
            onPurchaseRequest={handlePurchaseRequest}
            onContactRequest={handleContactRequest}
            onLoginRequest={handleLoginRequest}
          />
        );
      } else if (currentPage === 'landing') {
        // 蠕捺擂縺ｮLP繧定｡ｨ遉ｺ・磯ｻ定レ譎ｯ・・
        return (
          <>
            <Hero onAuthRequest={handleRegistrationRequest} onPurchaseRequest={handlePurchaseRequest} onLoginRequest={handleLoginRequest} />
            <ProblemMetrics />
            <SolutionFeatures />
            <ComparisonTable />
            <EfficiencyStats />
            <VideoGallery onTrialRequest={handleRegistrationRequest} />
            <TestPricing onDashboardNavigate={handleRegistrationRequest} onPurchaseRequest={handlePurchaseRequest} onContactRequest={handleContactRequest} />
            <CustomerReviews />
            <VideoRequestSection onTrialRequest={handleRegistrationRequest} />
            <TestFAQ />
            <FinalCTA onTrialRequest={handleRegistrationRequest} onContactRequest={handleContactRequest} onPurchaseRequest={handlePurchaseRequest} />
          </>
        );
      }
    }

    // Logged-in platform view
    // Allow only supported auth providers
    if (!isValidAuthProvider) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">!</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">利用できないログイン方法です</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Google / Apple / メールアドレスでログインしてください。
            </p>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              ログインページに戻る
            </button>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onLogout={handleLogout} onPageChange={handlePageChange} />;
      case 'mypage':
        return <MyPage onPageChange={handlePageChange} />;
      case 'admin':
        return <AdminUpload />;
      case 'staging-review':
        return <AdminStagingReview />;
      case 'auto-upload':
        return <AutoUpload />;
      case 'pricing':
        return <PricingPage onPageChange={handlePageChange} isNewUser={isNewUserRegistration} />;
      case 'payment-success':
        return <PaymentSuccess />;
      case 'payment-cancel':
        return <PaymentCancel />;
      case 'payment-history':
        return <PaymentHistory />;
      case 'download-history':
        return <DownloadHistory onPageChange={handlePageChange} />;
      case 'favorites':
        return <UserFavorites onPageChange={handlePageChange} />;
      case 'subscription-test':
        return <SubscriptionTestPanel />;
      case 'terms':
        return <TermsOfService onPageChange={handlePageChange} />;
      case 'privacy':
        return <PrivacyPolicy onPageChange={handlePageChange} />;
      default:
        return <Dashboard />; // default dashboard fallback
    }
  };

  // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ荳ｭ縺ｮ陦ｨ遉ｺ
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // SEO繝・・繧ｿ繧貞叙蠕・
  const pageType = getPageType(currentPage);
  const seoData = pageType ? pageSEOData[pageType] : pageSEOData.dashboard;
  const pathname = isLoggedIn ? `/${currentPage}` : '/';

  return (
    <HelmetProvider>
      <ErrorBoundary onError={(error, errorInfo) => {
        handleApiError(error, 'アプリケーションエラー');
      }}>
        <div className="min-h-screen bg-black force-white-h2">
          {/* SEO繝｡繧ｿ繧ｿ繧ｰ */}
          <SEOHead 
            title={seoData.title}
            description={seoData.description}
            url={`https://ai-creative-stock.com${pathname}`}
            type={isLoggedIn ? 'website' : 'website'}
          />
          
          <div className="min-h-screen">
            
            {/* 繧ｷ繝ｳ繝励ΝLP縺ｨ逋ｽ閭梧勹LP縺ｮ蝣ｴ蜷医・繝倥ャ繝繝ｼ繝ｻ繝輔ャ繧ｿ繝ｼ繧定｡ｨ遉ｺ縺励↑縺・*/}
            {(currentPage === 'simple-landing' || currentPage === 'white-landing') ? (
              <div>
                {renderContent()}
              </div>
            ) : (
              <>
                {/* 繝倥ャ繝繝ｼ縺ｯ鮟定レ譎ｯ繧堤ｶｭ謖・*/}
                <div className="bg-black text-white">
                  <Header
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    isLoggedIn={isLoggedIn}
                    onAuthRequest={handleAuthRequest}
                    onLogout={handleLogout}
                    userData={userData}
                    onLoginRequest={handleLoginRequest}
                    onRegistrationRequest={handleRegistrationRequest}
                  />
                </div>
                
                {/* 繧ｳ繝ｳ繝・Φ繝・Κ蛻・*/}
                <div className="bg-black" style={{ paddingTop: '80px' }}>
                  {renderContent()}
                </div>
                
                {/* 繝輔ャ繧ｿ繝ｼ縺ｯ鮟定レ譎ｯ繧堤ｶｭ謖・*/}
                <div className="bg-black text-white">
                  <Footer onPageChange={handlePageChange} />
                </div>
              </>
            )}
                
            {/* 繝代Φ縺上★繝ｪ繧ｹ繝・*/}
            {isLoggedIn && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
                <Breadcrumbs pathname={pathname} />
              </div>
            )}
            
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onAuthSuccess={handleAuthSuccess}
              mode={authMode}
            />

            <ContactModal
              isOpen={showContactModal}
              onClose={() => setShowContactModal(false)}
            />
            
            {/* 繧ｨ繝ｩ繝ｼ繝医・繧ｹ繝・*/}
            <ErrorToast 
              errors={errors}
              onRemove={removeError}
              onClearAll={clearErrors}
              position="top-right"
            />
          </div>
        </div>
      </ErrorBoundary>
    </HelmetProvider>
  );
}

export default App;













