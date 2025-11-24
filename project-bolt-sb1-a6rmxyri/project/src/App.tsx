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
  // URLとクエリから初期ペ�Eジを判定！Econtact 等�Eパス優先！E
  const urlParams = new URLSearchParams(window.location.search);
  const pathSegments = (typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)
    : []);
  const [pathSegment = '', subPathSegment = ''] = pathSegments;
  const isStripeCancelReturn = pathSegment === 'payment' && subPathSegment === 'cancel';
  const PATH_PAGES = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'];
  const initialVariant = isStripeCancelReturn
    ? 'pricing'
    : (PATH_PAGES.includes(pathSegment)
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
  const isNewUserRegistrationRef = useRef(false); // 同期フラグ管琁E��
  const initialAuthModeRef = useRef<string | null>(null);
  const postRegistrationHandledRef = useRef(false);
  const stripeCancelReturnRef = useRef(isStripeCancelReturn);
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

  // Stripeキャンセルで戻ったときはURLも状態も料金プランに固定する
  useEffect(() => {
    if (isStripeCancelReturn) {
      stripeCancelReturnRef.current = true;
      try {
        window.history.replaceState({}, document.title, '/pricing');
      } catch {}
      setCurrentPage('pricing');
    }
  }, [isStripeCancelReturn]);

  // ペ�Eジ遷移時に最上部にスクロール
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

  // 認証プロバイダーチェチE��関数
  const checkAuthProvider = (user: User): boolean => {
    // 開発環墁E��はモチE��ユーザーを許可
    if (isDevEnv) {
      return true;
    }

    // ユーザーの認証プロバイダーをチェチE��
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
    // �����v���t�@�C�������A�Ȃ���΍쐬�����݂�
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

    // �v���t�@�C�������Ȃ������ꍇ�́u�o�^���ヂ�[�h�v�̂Ƃ��������񈵂��ɂ���
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
            new Error('������Ă��Ȃ����O�C�����@�ł��BGoogle / Apple / ���[���A�h���X�Ń��O�C�����Ă��������B'),
            '�F�؃G���['
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
    const initialFirstLogin = isNewUserRegistrationRef.current;
    const returningFromStripeCancel = stripeCancelReturnRef.current || isStripeCancelReturn;
    const shouldStayOnPricing = initialFirstLogin || returningFromStripeCancel;
    if (shouldStayOnPricing) {
      setCurrentPage('pricing');
      stripeCancelReturnRef.current = false;
    } else {
      const targetPage = !isPublicPage(activePage)
        ? activePage
        : (activePage === 'pricing'
            ? 'pricing'
            : ((activePage === 'landing') ? 'dashboard' : (activePage || 'dashboard')));
      setCurrentPage(targetPage);
    }

    // �v���t�@�C���擾/�쐬�Ə��񔻒�̓o�b�N�O���E���h�Ŏ��{���AUI���~�߂Ȃ�
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

    // ���J�y�[�W���g�[�N�������Ȃ烍�[�f�B���O���o���Ȃ�
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
          try { handleApiError(error, '�F�؃G���[���������܂���'); } catch {}
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
        handleApiError(error, '�F�؃G���[���������܂���');
      }
      setCurrentPage('landing');
    } finally {
  // Loading screen�A�F�؂̓o�b�N�O���E���h�Ōp��
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

  // フォールバック処琁E 認証完亁E��にフラグを�E確誁E
  useEffect(() => {
    if (isLoggedIn && currentPage === 'dashboard' && (isNewUserRegistration || isNewUserRegistrationRef.current)) {
      console.log('=== フォールバック処琁E��衁E===');
      console.log('新規ユーザーがダチE��ュボ�EドにぁE��ため料��プランペ�Eジに修正');
      console.log('フラグ状慁E', { 
        isNewUserRegistration, 
        isNewUserRef: isNewUserRegistrationRef.current,
        currentPage 
      });
      setCurrentPage('pricing');
      // フラグをリセチE��
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
        handleApiError(new Error('���O�C�����K�v�ł�'), '�Ǘ��y�[�W�A�N�Z�X');
        return;
      }

      try {
        const { isAdmin } = await database.checkAdminStatus(userData.id);
        if (!isAdmin) {
          handleApiError(new Error('�Ǘ��҂̂݃A�N�Z�X�\�ł�'), '�Ǘ��y�[�W�A�N�Z�X');
          return;
        }
      } catch (error) {
        handleApiError(error, '�A�v���P�[�V�����G���[');
        return;
      }
    }
    setCurrentPage(page);
  };

  const handleAuthRequest = () => {
    isNewUserRegistrationRef.current = false; // refを�Eに設宁E
    setAuthMode('login');
    console.log('handleAuthRequest: 既存ユーザーフラグを設宁E- ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleLoginRequest = () => {
    isNewUserRegistrationRef.current = false; // refを�Eに設宁E
    setAuthMode('login');
    console.log('handleLoginRequest: 既存ユーザーログインフラグを設宁E- ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleRegistrationRequest = () => {
    // ログインしてぁE��ぁE��合�E認証モーダルを表示
    if (!isLoggedIn) {
      isNewUserRegistrationRef.current = true; // refを�Eに設宁E
      setIsNewUserRegistration(true); // 新規登録なのでフラグをtrueに
      console.log('handleRegistrationRequest: 新規登録フラグを設宁E- ref:', isNewUserRegistrationRef.current);
      setShowAuthModal(true);
      setAuthMode('register');
    }
    // ログイン済みの場合�E料��ペ�Eジへ
    setCurrentPage('pricing');
  };

  const handleContactRequest = () => {
    // 問い合わせ�Eペ�Eジ遷移で表示�E�EPに戻らなぁE��E
    setShowContactModal(false);
    setCurrentPage('contact');
    try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch {}
  };

  const handlePurchaseRequest = () => {
    // ログインしてぁE��ぁE��合�E認証モーダルを表示
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    // ログイン済みの場合�E料��ペ�Eジへ
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
        try { handleApiError(error as Error, '���O�A�E�g�Ɏ��s���܂���'); } catch {}
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
      // 未ログイン晁E ランチE��ングペ�Eジ選抁E
      if (currentPage === 'simple-landing') {
        // シンプルLPを表示
        return (
          <SimpleLandingPage
            onAuthRequest={handleRegistrationRequest}
            showAuthModal={showAuthModal}
            setShowAuthModal={setShowAuthModal}
          />
        );
      } else if (currentPage === 'white-landing') {
        // 白背景LPを表示
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
        // 従来のLPを表示�E�黒背景�E�E
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
            <h2 className="text-2xl font-bold mb-4">���p�ł��Ȃ����O�C�����@�ł�</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Google / Apple / ���[���A�h���X�Ń��O�C�����Ă��������B
            </p>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              ���O�C���y�[�W�ɖ߂�
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

  // ローチE��ング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // SEOチE�Eタを取征E
  const pageType = getPageType(currentPage);
  const seoData = pageType ? pageSEOData[pageType] : pageSEOData.dashboard;
  const pathname = isLoggedIn ? `/${currentPage}` : '/';

  return (
    <HelmetProvider>
      <ErrorBoundary onError={(error, errorInfo) => {
        handleApiError(error, '�A�v���P�[�V�����G���[');
      }}>
        <div className="min-h-screen bg-black force-white-h2">
          {/* SEOメタタグ */}
          <SEOHead 
            title={seoData.title}
            description={seoData.description}
            url={`https://ai-creative-stock.com${pathname}`}
            type={isLoggedIn ? 'website' : 'website'}
          />
          
          <div className="min-h-screen">
            
            {/* シンプルLPと白背景LPの場合�Eヘッダー・フッターを表示しなぁE*/}
            {(currentPage === 'simple-landing' || currentPage === 'white-landing') ? (
              <div>
                {renderContent()}
              </div>
            ) : (
              <>
                {/* ヘッダーは黒背景を維持E*/}
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
                
                {/* コンチE��チE��刁E*/}
                <div className="bg-black" style={{ paddingTop: '80px' }}>
                  {renderContent()}
                </div>
                
                {/* フッターは黒背景を維持E*/}
                <div className="bg-black text-white">
                  <Footer onPageChange={handlePageChange} />
                </div>
              </>
            )}
                
            {/* パンくずリスチE*/}
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
            
            {/* エラート�EスチE*/}
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


















