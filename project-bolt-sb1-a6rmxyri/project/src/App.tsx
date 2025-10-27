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
import NewRegistrationModal from './components/TrialRegistrationModal';
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
  // URLとクエリから初期ページを判定（/contact 等のパス優先）
  const urlParams = new URLSearchParams(window.location.search);
  const pathSegment = (typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0]
    : '') || '';
  const PATH_PAGES = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'];
  const initialVariant = (PATH_PAGES.includes(pathSegment)
    ? pathSegment
    : (urlParams.get('variant') || 'landing'));

  // Public pages that don't require authentication
  const PUBLIC_PAGES = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'];

  const [currentPage, setCurrentPage] = useState(initialVariant);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidAuthProvider, setIsValidAuthProvider] = useState(false);
  const [isNewUserRegistration, setIsNewUserRegistration] = useState(false);
  const isNewUserRegistrationRef = useRef(false); // 同期フラグ管理用
  const { errors, removeError, clearErrors, handleApiError } = useErrorHandler();

  // 認証プロバイダーチェック関数
  const checkAuthProvider = (user: User): boolean => {
    // 開発環境ではモックユーザーを許可
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      return true;
    }

    // ユーザーの認証プロバイダーをチェック
    const authProvider = user.app_metadata?.provider;
    const validProviders = ['google', 'apple'];
    
    console.log('Auth provider check:', { 
      provider: authProvider, 
      email: user.email,
      userId: user.id 
    });
    
    return validProviders.includes(authProvider);
  };

  // 認証状態の初期化と監視
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // URLパラメータを確認
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const mode = urlParams.get('mode');
        
        console.log('=== 초기화 処理開始 ===');
        console.log('URLパラメータ詳細:', { 
          hasAccessToken: !!accessToken, 
          mode,
          currentPage,
          isNewUserRegistration,
          isNewUserRef: isNewUserRegistrationRef.current,
          url: window.location.href
        });
        
        // URLにアクセストークンが含まれている場合（OAuth コールバック）
        if (accessToken) {
          console.log('OAuthコールバック検出: トークンからセッションを設定');
          
          // modeパラメータに基づいてフラグを設定
          if (mode === 'registration') {
            console.log('新規登録モードを検出');
            isNewUserRegistrationRef.current = true; // refを先に設定
            setIsNewUserRegistration(true);
            console.log('新規ユーザーフラグ設定完了 - ref:', isNewUserRegistrationRef.current);
          } else if (mode === 'login') {
            console.log('ログインモードを検出');
            isNewUserRegistrationRef.current = false; // refを先に設定
            setIsNewUserRegistration(false);
            console.log('既存ユーザーフラグ設定完了 - ref:', isNewUserRegistrationRef.current);
          }
          
          try {
            // Supabaseにセッションを設定
            const { data: { user }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) throw error;
            
            if (user) {
              console.log('OAuth認証成功:', user.email);
              
              // 新規登録の場合は料金プランページに、ログインの場合はonAuthStateChangeで処理
              if (mode === 'registration') {
                console.log('新規登録完了 - 料金プランページに遷移');
                setCurrentPage('pricing');
              }
              
              // URLからクエリパラメータを削除
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (error) {
            console.error('OAuth セッション設定エラー:', error);
          }
        }

        // 開発環境では localStorage から認証状態を復元（無効化）
        if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
          console.log('開発環境: 自動ログインを無効化');
          // 自動ログイン復元をコメントアウトして、常にログアウト状態で開始
          /*
          const savedUser = localStorage.getItem('dev_user');
          const savedLoginState = localStorage.getItem('dev_logged_in');
          
          if (savedUser && savedLoginState === 'true') {
            const user = JSON.parse(savedUser);
            setUserData(user);
            setIsLoggedIn(true);
            isNewUserRegistrationRef.current = false; // refを先に設定
            setIsNewUserRegistration(false); // 開発環境復元時は既存ユーザーとして扱う
            setCurrentPage('dashboard');
            console.log('開発環境復元完了 - ref:', isNewUserRegistrationRef.current);
          } else {
            setCurrentPage('landing');
            setIsLoggedIn(false);
          }
          */
          // パスに公開ページ（/contact 等）があればそれを優先
          const devPath = (typeof window !== 'undefined'
            ? window.location.pathname.split('/').filter(Boolean)[0]
            : '') || '';
          const isPublicDevPath = ['terms', 'privacy', 'refund', 'commercial', 'contact', 'pricing', 'landing', 'simple-landing', 'white-landing'].includes(devPath);
          setCurrentPage(isPublicDevPath ? devPath : 'landing');
          setIsLoggedIn(false);
          setUserData(null);
          // localStorageもクリア
          localStorage.removeItem('dev_user');
          localStorage.removeItem('dev_logged_in');
          setIsLoading(false);
          return;
        }

        const { user } = await auth.getCurrentUser();
        console.log('初期化時のユーザー状態:', user ? '認証済み' : '未認証');
        
        if (user) {
          const validProvider = checkAuthProvider(user);
          setIsValidAuthProvider(validProvider);
          setUserData(user);
          setIsLoggedIn(true);
          isNewUserRegistrationRef.current = false; // refを先に設定
          setIsNewUserRegistration(false); // 初期化時は既存ユーザーとして扱う

          if (validProvider) {
            // Only redirect to dashboard if not on a public page
            if (!PUBLIC_PAGES.includes(currentPage)) {
              setCurrentPage('dashboard');
              console.log('初期化: 認証済みユーザー - ダッシュボードに移動 - ref:', isNewUserRegistrationRef.current);
            } else {
              console.log('初期化: 認証済みユーザー - 公開ページを維持:', currentPage);
            }
          } else {
            // 無効な認証プロバイダーの場合はログアウト
            await auth.signOut();
            setCurrentPage('landing');
            handleApiError(new Error('許可された認証方法ではありません。GoogleまたはApple IDでログインしてください。'), '認証エラー');
          }
        } else {
          setCurrentPage('landing'); // 未ログインの場合はランディングページに
          console.log('初期化: 未認証ユーザー - ランディングページに移動');
        }
      } catch (error) {
        console.error('認証初期化エラー:', error);
        // 開発環境ではエラーを表示せず、ランディングページに移動
        if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
          console.log('開発環境: 認証エラーを無視してランディングページに移動');
        } else {
          handleApiError(error, '認証システムの初期化');
        }
        setCurrentPage('landing');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 認証状態の変更を監視
    let subscription: any;
    try {
      const { data: { subscription: authSubscription } } = auth.onAuthStateChange(
        async (_, session) => {
          console.log('=== 認証状態変更検出 ===');
          console.log('認証状態:', session?.user ? 'ログイン' : 'ログアウト');
          
          const isNewUserState = isNewUserRegistration;
          const isNewUserRef = isNewUserRegistrationRef.current;
          const isNewUser = isNewUserRef || isNewUserState; // refを優先
          
          console.log('フラグ状態詳細:', {
            isNewUserState,
            isNewUserRef,
            isNewUser,
            currentPage,
            timestamp: new Date().toISOString()
          });
          
          if (session?.user) {
            const validProvider = checkAuthProvider(session.user);
            setIsValidAuthProvider(validProvider);
            setUserData(session.user);
            setIsLoggedIn(true);

            if (validProvider) {
              // refを優先して新規ユーザー判定
              if (isNewUser) {
                console.log('新規ユーザー確認済み: 料金プランページに設定');
                setCurrentPage('pricing'); // 明示的に設定
                console.log('料金プランページ設定完了');
                // フラグをリセット
                isNewUserRegistrationRef.current = false;
                setIsNewUserRegistration(false);
              } else {
                console.log('既存ユーザー認証成功');
                // Only redirect to dashboard if not on a public page
                if (!PUBLIC_PAGES.includes(currentPage)) {
                  console.log('ダッシュボードに移動');
                  setCurrentPage('dashboard');
                } else {
                  console.log('公開ページを維持:', currentPage);
                }
              }
            } else {
              // 無効な認証プロバイダーの場合はログアウト
              await auth.signOut();
              setCurrentPage('landing');
              handleApiError(new Error('許可された認証方法ではありません。GoogleまたはApple IDでログインしてください。'), '認証エラー');
            }
          } else {
            setUserData(null);
            setIsLoggedIn(false);
            setIsValidAuthProvider(false);
            setCurrentPage('landing'); // ログアウト時はランディングページに移動
            console.log('ログアウト: ランディングページに移動');
          }
          setIsLoading(false);
        }
      );
      subscription = authSubscription;
      console.log('認証状態監視リスナー設定完了');
    } catch (error) {
      console.error('認証状態監視エラー:', error);
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // フォールバック処理: 認証完了後にフラグを再確認
  useEffect(() => {
    if (isLoggedIn && currentPage === 'dashboard' && (isNewUserRegistration || isNewUserRegistrationRef.current)) {
      console.log('=== フォールバック処理実行 ===');
      console.log('新規ユーザーがダッシュボードにいるため料金プランページに修正');
      console.log('フラグ状態:', { 
        isNewUserRegistration, 
        isNewUserRef: isNewUserRegistrationRef.current,
        currentPage 
      });
      setCurrentPage('pricing');
      // フラグをリセット
      isNewUserRegistrationRef.current = false;
      setIsNewUserRegistration(false);
    }
  }, [isLoggedIn, currentPage, isNewUserRegistration]);


  const handlePageChange = async (page: string) => {
    // 管理者チェック（データベースベース）
    if (page === 'admin' || page === 'auto-upload') {
      // 開発環境では管理者チェックをスキップ
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('開発環境: 管理者チェックをスキップしています');
        setCurrentPage(page);
        return;
      }

      if (!userData?.id) {
        handleApiError(new Error('ログインが必要です'), '管理者ページアクセス');
        return;
      }
      
      try {
        const { isAdmin } = await database.checkAdminStatus(userData.id);
        if (!isAdmin) {
          handleApiError(new Error('管理者のみアクセス可能です'), '管理者ページアクセス');
          return;
        }
      } catch (error) {
        handleApiError(error, '管理者権限チェック');
        return;
      }
    }
    setCurrentPage(page);
  };

  const handleAuthRequest = () => {
    isNewUserRegistrationRef.current = false; // refを先に設定
    setIsNewUserRegistration(false); // 既存ユーザーログインなのでフラグをfalseに
    console.log('handleAuthRequest: 既存ユーザーフラグを設定 - ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleTrialRequest = () => {
    isNewUserRegistrationRef.current = true; // refを先に設定
    setIsNewUserRegistration(true); // 新規ユーザー登録なのでフラグをtrueに
    console.log('handleTrialRequest: 新規ユーザーフラグを設定 - ref:', isNewUserRegistrationRef.current);
    setShowRegistrationModal(true);
  };

  const handleRegistrationRequest = () => {
    isNewUserRegistrationRef.current = true; // refを先に設定
    setIsNewUserRegistration(true); // 新規ユーザー登録なのでフラグをtrueに 
    console.log('handleRegistrationRequest: 新規ユーザーフラグを設定 - ref:', isNewUserRegistrationRef.current);
    setShowRegistrationModal(true);
  };

  const handleContactRequest = () => {
    setShowContactModal(true);
  };

  const handlePurchaseRequest = () => {
    isNewUserRegistrationRef.current = true; // refを先に設定
    setIsNewUserRegistration(true); // 新規ユーザー登録なのでフラグをtrueに
    console.log('handlePurchaseRequest: 新規ユーザーフラグを設定 - ref:', isNewUserRegistrationRef.current);
    // 新規登録モーダルを表示
    setShowRegistrationModal(true);
  };

  const handleAuthSuccess = (user: User) => {
    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    setUserData(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);

    if (validProvider) {
      // Only redirect to dashboard if not on a public page
      if (!PUBLIC_PAGES.includes(currentPage)) {
        setCurrentPage('dashboard');
      }
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('許可された認証方法ではありません。GoogleまたはApple IDでログインしてください。'), '認証エラー');
    }
    
    // 開発環境では localStorage に保存
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };

  // 新規ユーザー認証成功時（料金プランページへ誘導）
  const handleNewUserAuthSuccess = (user: User) => {
    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    setUserData(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    
    if (validProvider) {
      setCurrentPage('pricing'); // 新規ユーザーは料金プランページに誘導
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('許可された認証方法ではありません。GoogleまたはApple IDでログインしてください。'), '認証エラー');
    }
    
    // 開発環境では localStorage に保存
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };

  const handleRegistrationSuccess = (user: User) => {
    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    setUserData(user);
    setIsLoggedIn(true);
    setShowRegistrationModal(false);

    if (validProvider) {
      // Only redirect to dashboard if not on a public page
      if (!PUBLIC_PAGES.includes(currentPage)) {
        setCurrentPage('dashboard');
      }
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('許可された認証方法ではありません。GoogleまたはApple IDでログインしてください。'), '認証エラー');
    }
    
    // 開発環境では localStorage に保存
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };

  // 認証成功後に料金プランページに誘導（NewRegistrationModal用）
  const handleAuthSuccessForPricing = (authData: any) => {
    console.log('handleAuthSuccessForPricing実行:', authData);
    console.log('現在のisNewUserRegistrationフラグ:', isNewUserRegistration);
    setIsNewUserRegistration(true); // 新規ユーザー登録フラグを設定
    console.log('フラグをtrueに設定完了');
    setCurrentPage('pricing'); // 直接料金プランページに遷移
    console.log('料金プランページに遷移');
    setShowRegistrationModal(false); // モーダルを閉じる
    console.log('モーダルを閉じる');
  };


  const handleLogout = async () => {
    console.log('handleLogout関数が呼ばれました');
    console.log('現在の状態:', { isLoggedIn, currentPage, userData: userData?.email });
    
    try {
      // 開発環境では localStorage をクリア
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('開発環境: localStorage をクリア');
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
        console.log('localStorage クリア完了');
      } else {
        console.log('本番環境: Supabase auth.signOut 実行');
        await auth.signOut();
      }
      
      console.log('ログアウト処理: 状態をリセット');
      setIsLoggedIn(false);
      setUserData(null);
      setIsValidAuthProvider(false);
      setCurrentPage('landing'); // ログアウト後はオリジナルLPに移動
      console.log('ログアウト処理完了: LPに遷移');
      
    } catch (error) {
      console.error('ログアウトエラー:', error);
      if (!(import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development')) {
        handleApiError(error, 'ログアウト処理');
      }
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
      // 未ログイン時: ランディングページ選択
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
            onAuthRequest={handleAuthRequest}
            onTrialRequest={handleRegistrationRequest}
            onPurchaseRequest={handlePurchaseRequest}
            onContactRequest={handleContactRequest}
          />
        );
      } else if (currentPage === 'landing') {
        // 従来のLPを表示（黒背景）
        return (
          <>
            <Hero onAuthRequest={handleRegistrationRequest} onPurchaseRequest={handlePurchaseRequest} />
            <ProblemMetrics />
            <SolutionFeatures />
            <ComparisonTable />
            <EfficiencyStats />
            <VideoGallery onTrialRequest={handleRegistrationRequest} />
            <TestPricing onTrialRequest={handleRegistrationRequest} onPurchaseRequest={handlePurchaseRequest} />
            <CustomerReviews />
            <VideoRequestSection onTrialRequest={handleRegistrationRequest} />
            <TestFAQ />
            <FinalCTA onTrialRequest={handleRegistrationRequest} onContactRequest={handleContactRequest} onPurchaseRequest={handlePurchaseRequest} />
          </>
        );
      }
    }

    // ログイン済み時: 動画プラットフォーム
    // Google/Apple認証のみアクセス許可
    if (!isValidAuthProvider) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">アクセスが制限されています</h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              AI Creative Stockへのアクセスには、GoogleまたはApple IDでのログインが必要です。
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
        return <Dashboard />; // デフォルトはダッシュボード
    }
  };

  // ローディング中の表示
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

  // SEOデータを取得
  const pageType = getPageType(currentPage);
  const seoData = pageType ? pageSEOData[pageType] : pageSEOData.dashboard;
  const pathname = isLoggedIn ? `/${currentPage}` : '/';

  return (
    <HelmetProvider>
      <ErrorBoundary onError={(error, errorInfo) => {
        handleApiError(error, 'アプリケーションエラー');
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
            
            {/* シンプルLPと白背景LPの場合はヘッダー・フッターを表示しない */}
            {(currentPage === 'simple-landing' || currentPage === 'white-landing') ? (
              <div>
                {renderContent()}
              </div>
            ) : (
              <>
                {/* ヘッダーは黒背景を維持 */}
                <div className="bg-black text-white">
                  <Header 
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    isLoggedIn={isLoggedIn}
                    onAuthRequest={handleAuthRequest}
                    onTrialRequest={handleRegistrationRequest}
                    onLogout={handleLogout}
                    userData={userData}
                  />
                </div>
                
                {/* コンテンツ部分 */}
                <div className="bg-black" style={{ paddingTop: '80px' }}>
                  {renderContent()}
                </div>
                
                {/* フッターは黒背景を維持 */}
                <div className="bg-black text-white">
                  <Footer onPageChange={handlePageChange} />
                </div>
              </>
            )}
                
            {/* パンくずリスト */}
            {isLoggedIn && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
                <Breadcrumbs pathname={pathname} />
              </div>
            )}
            
            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
              onAuthSuccess={handleAuthSuccess}
            />
            
            <NewRegistrationModal
              isOpen={showRegistrationModal}
              onClose={() => setShowRegistrationModal(false)}
              onRegistrationSuccess={handleRegistrationSuccess}
              onAuthSuccess={handleAuthSuccessForPricing}
            />
            
            <ContactModal
              isOpen={showContactModal}
              onClose={() => setShowContactModal(false)}
            />
            
            {/* エラートースト */}
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
