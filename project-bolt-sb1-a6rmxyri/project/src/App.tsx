﻿import React from 'react';
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
  // URL繝代Λ繝｡繝ｼ繧ｿ縺九ｉ繝舌Μ繧｢繝ｳ繝医ｒ蜿門ｾ暦ｼ医ョ繝輔か繝ｫ繝医・'landing'・・
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/^\/+/, '');
  // 強制的に静的ページへ委譲したいパス（文字化け・スクロール問題の回避）
  const STATIC_PAGES = new Set([
    'terms',
    'privacy',
    'refund',
    'commercial',
    'contact'
  ]);
  if (STATIC_PAGES.has(path)) {
    // すでに静的HTMLを返すよう Vercel 側でルーティング済みだが、
    // SPA がロードされた場合にも確実にサーバー遷移させる
    const dest = `/${path}/index.html`;
    if (!window.location.pathname.endsWith('/index.html')) {
      window.location.replace(dest);
    }
  }
  const pathPage = ((): string => {
    switch (path) {
      case 'terms':
      case 'privacy':
      case 'refund':
      case 'commercial':
      case 'contact':
      case 'pricing':
      case 'dashboard':
      case 'mypage':
      case 'favorites':
      case 'download-history':
      case 'payment-history':
      case 'payment-success':
      case 'payment-cancel':
      case 'subscription-test':
      case 'admin':
      case 'staging-review':
      case 'auto-upload':
      case 'simple-landing':
      case 'white-landing':
        return path;
      case '':
      default:
        return '';
    }
  })();
  const initialVariant = pathPage || urlParams.get('variant') || 'landing';
  
  const [currentPage, setCurrentPage] = useState(initialVariant);
  const publicPages = new Set([
    'terms',
    'privacy',
    'refund',
    'commercial',
    'contact'
  ]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidAuthProvider, setIsValidAuthProvider] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isNewUserRegistration, setIsNewUserRegistration] = useState(false);
  const isNewUserRegistrationRef = useRef(false); // 蜷梧悄繝輔Λ繧ｰ邂｡逅・畑
  const { errors, removeError, clearErrors, handleApiError } = useErrorHandler();
  // Admin IP allowlist (client-side)
  const adminIpAllowlist = (import.meta.env.VITE_ADMIN_IP_ALLOWLIST || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  
  // 譛ｪ繝ｭ繧ｰ繧､繝ｳ縺ｧ繧ょ・髢九・繝ｼ繧ｸ縺ｯ逶ｴ謗･繧｢繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ縺ｫ縺吶ｋ
  useEffect(() => {
    if (!isLoggedIn && !publicPages.has(currentPage)) {
      const rawPath = window.location.pathname.replace(/^\/+/, '');
      if (publicPages.has(rawPath)) {
        setCurrentPage(rawPath);
      }
    }
  }, [isLoggedIn]);

  // 隱崎ｨｼ繝励Ο繝舌う繝繝ｼ繝√ぉ繝・け髢｢謨ｰ
  const checkAuthProvider = (user: User): boolean => {
    // 髢狗匱迺ｰ蠅・〒縺ｯ繝｢繝・け繝ｦ繝ｼ繧ｶ繝ｼ繧定ｨｱ蜿ｯ
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      return true;
    }

    // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ隱崎ｨｼ繝励Ο繝舌う繝繝ｼ繧偵メ繧ｧ繝・け
    const authProvider = user.app_metadata?.provider;
    const validProviders = ['google', 'email'];
    
    console.log('Auth provider check:', { 
      provider: authProvider, 
      email: user.email,
      userId: user.id 
    });
    
    return validProviders.includes(authProvider);
  };

  // 隱崎ｨｼ迥ｶ諷九・蛻晄悄蛹悶→逶｣隕・
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // URL繝代Λ繝｡繝ｼ繧ｿ繧堤｢ｺ隱・
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const mode = urlParams.get('mode');
        
        console.log('=== ・一ｸｰ嶹・蜃ｦ逅・幕蟋・===');
        console.log('URL繝代Λ繝｡繝ｼ繧ｿ隧ｳ邏ｰ:', { 
          hasAccessToken: !!accessToken, 
          mode,
          currentPage,
          isNewUserRegistration,
          isNewUserRef: isNewUserRegistrationRef.current,
          url: window.location.href
        });
        
        // URL縺ｫ繧｢繧ｯ繧ｻ繧ｹ繝医・繧ｯ繝ｳ縺悟性縺ｾ繧後※縺・ｋ蝣ｴ蜷茨ｼ・Auth 繧ｳ繝ｼ繝ｫ繝舌ャ繧ｯ・・
        if (accessToken) {
          console.log('OAuth繧ｳ繝ｼ繝ｫ繝舌ャ繧ｯ讀懷・: 繝医・繧ｯ繝ｳ縺九ｉ繧ｻ繝・す繝ｧ繝ｳ繧定ｨｭ螳・);
          
          // mode繝代Λ繝｡繝ｼ繧ｿ縺ｫ蝓ｺ縺･縺・※繝輔Λ繧ｰ繧定ｨｭ螳・
          if (mode === 'registration') {
            console.log('譁ｰ隕冗匳骭ｲ繝｢繝ｼ繝峨ｒ讀懷・');
            isNewUserRegistrationRef.current = true; // ref繧貞・縺ｫ險ｭ螳・
            setIsNewUserRegistration(true);
            console.log('譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ險ｭ螳壼ｮ御ｺ・- ref:', isNewUserRegistrationRef.current);
          } else if (mode === 'login') {
            console.log('繝ｭ繧ｰ繧､繝ｳ繝｢繝ｼ繝峨ｒ讀懷・');
            isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
            setIsNewUserRegistration(false);
            console.log('譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ險ｭ螳壼ｮ御ｺ・- ref:', isNewUserRegistrationRef.current);
          }
          
          try {
            // Supabase縺ｫ繧ｻ繝・す繝ｧ繝ｳ繧定ｨｭ螳・
            const { data: { user }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) throw error;
            
            if (user) {
              console.log('OAuth隱崎ｨｼ謌仙粥:', user.email);
              
              // 譁ｰ隕冗匳骭ｲ縺ｮ蝣ｴ蜷医・譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ縲√Ο繧ｰ繧､繝ｳ縺ｮ蝣ｴ蜷医・onAuthStateChange縺ｧ蜃ｦ逅・
              if (mode === 'registration') {
                console.log('譁ｰ隕冗匳骭ｲ螳御ｺ・- 譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ驕ｷ遘ｻ');
                setCurrentPage('pricing');
              }
              
              // URL縺九ｉ繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ繧貞炎髯､
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (error) {
            console.error('OAuth 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳壹お繝ｩ繝ｼ:', error);
          }
        }

        // 髢狗匱迺ｰ蠅・〒縺ｯ localStorage 縺九ｉ隱崎ｨｼ迥ｶ諷九ｒ蠕ｩ蜈・ｼ育┌蜉ｹ蛹厄ｼ・
        if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
          console.log('髢狗匱迺ｰ蠅・ 閾ｪ蜍輔Ο繧ｰ繧､繝ｳ繧堤┌蜉ｹ蛹・);
          // 閾ｪ蜍輔Ο繧ｰ繧､繝ｳ蠕ｩ蜈・ｒ繧ｳ繝｡繝ｳ繝医い繧ｦ繝医＠縺ｦ縲∝ｸｸ縺ｫ繝ｭ繧ｰ繧｢繧ｦ繝育憾諷九〒髢句ｧ・
          /*
          const savedUser = localStorage.getItem('dev_user');
          const savedLoginState = localStorage.getItem('dev_logged_in');
          
          if (savedUser && savedLoginState === 'true') {
            const user = JSON.parse(savedUser);
            setUserData(user);
            setIsLoggedIn(true);
            isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
            setIsNewUserRegistration(false); // 髢狗匱迺ｰ蠅・ｾｩ蜈・凾縺ｯ譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｨ縺励※謇ｱ縺・
            setCurrentPage('dashboard');
            console.log('髢狗匱迺ｰ蠅・ｾｩ蜈・ｮ御ｺ・- ref:', isNewUserRegistrationRef.current);
          } else {
            setCurrentPage('landing');
            setIsLoggedIn(false);
          }
          */
          // 蟶ｸ縺ｫ繝ｭ繧ｰ繧｢繧ｦ繝育憾諷九〒繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ繧定｡ｨ遉ｺ
          setCurrentPage(prev => (publicPages.has(prev) || prev === 'landing' || prev === 'simple-landing' || prev === 'white-landing') ? prev : 'landing');
          setIsLoggedIn(false);
          setUserData(null);
          // localStorage繧ゅけ繝ｪ繧｢
          localStorage.removeItem('dev_user');
          localStorage.removeItem('dev_logged_in');
          setIsLoading(false);
          return;
        }

        const { user } = await auth.getCurrentUser();
        console.log('蛻晄悄蛹匁凾縺ｮ繝ｦ繝ｼ繧ｶ繝ｼ迥ｶ諷・', user ? '隱崎ｨｼ貂医∩' : '譛ｪ隱崎ｨｼ');
        
        if (user) {
          const validProvider = checkAuthProvider(user);
          setIsValidAuthProvider(validProvider);
          setUserData(user);
          setIsLoggedIn(true);
          isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
          setIsNewUserRegistration(false); // 蛻晄悄蛹匁凾縺ｯ譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｨ縺励※謇ｱ縺・
          
          if (validProvider) {
            setCurrentPage('dashboard'); // Google/Apple隱崎ｨｼ縺ｮ蝣ｴ蜷医・縺ｿ繝繝・す繝･繝懊・繝峨↓
            console.log('蛻晄悄蛹・ 隱崎ｨｼ貂医∩繝ｦ繝ｼ繧ｶ繝ｼ - 繝繝・す繝･繝懊・繝峨↓遘ｻ蜍・- ref:', isNewUserRegistrationRef.current);
          } else {
            // 辟｡蜉ｹ縺ｪ隱崎ｨｼ繝励Ο繝舌う繝繝ｼ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ繧｢繧ｦ繝・
            await auth.signOut();
            setCurrentPage('landing');
            handleApiError(new Error('險ｱ蜿ｯ縺輔ｌ縺溯ｪ崎ｨｼ譁ｹ豕輔〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・oogle縺ｧ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・), '隱崎ｨｼ繧ｨ繝ｩ繝ｼ');
          }
        } else {
          setCurrentPage('landing'); // 譛ｪ繝ｭ繧ｰ繧､繝ｳ縺ｮ蝣ｴ蜷医・繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ
          console.log('蛻晄悄蛹・ 譛ｪ隱崎ｨｼ繝ｦ繝ｼ繧ｶ繝ｼ - 繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍・);
        }
      } catch (error) {
        console.error('隱崎ｨｼ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
        // 髢狗匱迺ｰ蠅・〒縺ｯ繧ｨ繝ｩ繝ｼ繧定｡ｨ遉ｺ縺帙★縲√Λ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍・
        if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
          console.log('髢狗匱迺ｰ蠅・ 隱崎ｨｼ繧ｨ繝ｩ繝ｼ繧堤┌隕悶＠縺ｦ繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍・);
        } else {
          handleApiError(error, '隱崎ｨｼ繧ｷ繧ｹ繝・Β縺ｮ蛻晄悄蛹・);
        }
        setCurrentPage('landing');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // 隱崎ｨｼ迥ｶ諷九・螟画峩繧堤屮隕・
    let subscription: any;
    try {
      const { data: { subscription: authSubscription } } = auth.onAuthStateChange(
        async (_, session) => {
          console.log('=== 隱崎ｨｼ迥ｶ諷句､画峩讀懷・ ===');
          console.log('隱崎ｨｼ迥ｶ諷・', session?.user ? '繝ｭ繧ｰ繧､繝ｳ' : '繝ｭ繧ｰ繧｢繧ｦ繝・);
          
          const isNewUserState = isNewUserRegistration;
          const isNewUserRef = isNewUserRegistrationRef.current;
          const isNewUser = isNewUserRef || isNewUserState; // ref繧貞━蜈・
          
          console.log('繝輔Λ繧ｰ迥ｶ諷玖ｩｳ邏ｰ:', {
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
              // ref繧貞━蜈医＠縺ｦ譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ蛻､螳・
              if (isNewUser) {
                console.log('譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ遒ｺ隱肴ｸ医∩: 譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ險ｭ螳・);
                setCurrentPage('pricing'); // 譏守､ｺ逧・↓險ｭ螳・
                console.log('譁咎≡繝励Λ繝ｳ繝壹・繧ｸ險ｭ螳壼ｮ御ｺ・);
                // 繝輔Λ繧ｰ繧偵Μ繧ｻ繝・ヨ
                isNewUserRegistrationRef.current = false;
                setIsNewUserRegistration(false);
              } else {
                console.log('譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ隱崎ｨｼ謌仙粥: 繝繝・す繝･繝懊・繝峨↓遘ｻ蜍・);
                setCurrentPage('dashboard');
              }
            } else {
              // 辟｡蜉ｹ縺ｪ隱崎ｨｼ繝励Ο繝舌う繝繝ｼ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ繧｢繧ｦ繝・
              await auth.signOut();
              setCurrentPage('landing');
              handleApiError(new Error('險ｱ蜿ｯ縺輔ｌ縺溯ｪ崎ｨｼ譁ｹ豕輔〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・oogle縺ｧ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・), '隱崎ｨｼ繧ｨ繝ｩ繝ｼ');
            }
          } else {
            setUserData(null);
            setIsLoggedIn(false);
            setIsValidAuthProvider(false);
            setCurrentPage('landing'); // 繝ｭ繧ｰ繧｢繧ｦ繝域凾縺ｯ繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍・
            console.log('繝ｭ繧ｰ繧｢繧ｦ繝・ 繝ｩ繝ｳ繝・ぅ繝ｳ繧ｰ繝壹・繧ｸ縺ｫ遘ｻ蜍・);
          }
          setIsLoading(false);
        }
      );
      subscription = authSubscription;
      console.log('隱崎ｨｼ迥ｶ諷狗屮隕悶Μ繧ｹ繝翫・險ｭ螳壼ｮ御ｺ・);
    } catch (error) {
      console.error('隱崎ｨｼ迥ｶ諷狗屮隕悶お繝ｩ繝ｼ:', error);
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
    // 邂｡逅・・メ繧ｧ繝・け・医ョ繝ｼ繧ｿ繝吶・繧ｹ繝吶・繧ｹ・・
    if (page === 'admin' || page === 'auto-upload') {
      // 髢狗匱迺ｰ蠅・〒縺ｯ邂｡逅・・メ繧ｧ繝・け繧偵せ繧ｭ繝・・
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('髢狗匱迺ｰ蠅・ 邂｡逅・・メ繧ｧ繝・け繧偵せ繧ｭ繝・・縺励※縺・∪縺・);
        setCurrentPage(page);
        return;
      }

      if (!userData?.id) {
        handleApiError(new Error('繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺・), '邂｡逅・・・繝ｼ繧ｸ繧｢繧ｯ繧ｻ繧ｹ');
        return;
      }
      // Enforce IP allowlist for admin areas if configured
      if (adminIpAllowlist.length > 0 && (page === 'admin' || page === 'staging-review')) {
        try {
          const resp = await fetch('https://api.ipify.org?format=json');
          const ip = (await resp.json()).ip as string;
          if (!adminIpAllowlist.includes(ip)) {
            handleApiError(new Error('邂｡逅・・判髱｢縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺悟宛髯舌＆繧後※縺・∪縺呻ｼ・P蛻ｶ髯撰ｼ・), '繧｢繧ｯ繧ｻ繧ｹ蛻ｶ髯・);
            return;
          }
        } catch {
          handleApiError(new Error('IP讀懆ｨｼ縺ｫ螟ｱ謨励＠縺ｾ縺励◆'), '繧｢繧ｯ繧ｻ繧ｹ蛻ｶ髯・);
          return;
        }
      }

      try {
        const { isAdmin } = await database.checkAdminStatus(userData.id);
        if (!isAdmin) {
          handleApiError(new Error('邂｡逅・・・縺ｿ繧｢繧ｯ繧ｻ繧ｹ蜿ｯ閭ｽ縺ｧ縺・), '邂｡逅・・・繝ｼ繧ｸ繧｢繧ｯ繧ｻ繧ｹ');
          return;
        }
      } catch (error) {
        handleApiError(error, '邂｡逅・・ｨｩ髯舌メ繧ｧ繝・け');
        return;
      }
    }
    setCurrentPage(page);
  };

  const handleAuthRequest = () => {
    isNewUserRegistrationRef.current = false; // ref繧貞・縺ｫ險ｭ螳・
    setIsNewUserRegistration(false); // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ繝ｭ繧ｰ繧､繝ｳ縺ｪ縺ｮ縺ｧ繝輔Λ繧ｰ繧断alse縺ｫ
    console.log('handleAuthRequest: 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    setShowAuthModal(true);
  };

  const handleTrialRequest = () => {
    isNewUserRegistrationRef.current = true; // ref繧貞・縺ｫ險ｭ螳・
    setIsNewUserRegistration(true); // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ縺ｪ縺ｮ縺ｧ繝輔Λ繧ｰ繧稚rue縺ｫ
    console.log('handleTrialRequest: 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    setShowRegistrationModal(true);
  };

  const handleRegistrationRequest = () => {
    isNewUserRegistrationRef.current = true; // ref繧貞・縺ｫ險ｭ螳・
    setIsNewUserRegistration(true); // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ縺ｪ縺ｮ縺ｧ繝輔Λ繧ｰ繧稚rue縺ｫ 
    console.log('handleRegistrationRequest: 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    setShowRegistrationModal(true);
  };

  const handleContactRequest = () => {
    setShowContactModal(true);
  };

  const handlePurchaseRequest = () => {
    isNewUserRegistrationRef.current = true; // ref繧貞・縺ｫ險ｭ螳・
    setIsNewUserRegistration(true); // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ縺ｪ縺ｮ縺ｧ繝輔Λ繧ｰ繧稚rue縺ｫ
    console.log('handlePurchaseRequest: 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ繝輔Λ繧ｰ繧定ｨｭ螳・- ref:', isNewUserRegistrationRef.current);
    // 譁ｰ隕冗匳骭ｲ繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
    setShowRegistrationModal(true);
  };

  // 繝ｫ繝ｼ繝・ぅ繝ｳ繧ｰ: 繝壹・繧ｸ螟画峩譎ゅ↓URL繧呈峩譁ｰ縲∵綾繧・騾ｲ繧縺ｫ霑ｽ蠕・
  useEffect(() => {
    const onPopState = () => {
      const newPath = window.location.pathname.replace(/^\/+/, '');
      setCurrentPage(newPath || 'landing');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // setCurrentPage 繧剃ｼｴ縺・・遘ｻ縺ｧ URL 繧貞酔譛・
  useEffect(() => {
    const publicPages = new Set(['landing','simple-landing','white-landing','terms','privacy','refund','commercial','contact',
      'pricing',
    ]);
    const pathForPage = currentPage === 'landing' ? '/' : `/${currentPage}`;
    if (window.location.pathname !== pathForPage) {
      window.history.pushState({}, '', pathForPage);
    }
    if (publicPages.has(currentPage)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  const handleAuthSuccess = (user: User) => {
    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    setUserData(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    
    if (validProvider) {
      setCurrentPage('dashboard'); // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ繝ｭ繧ｰ繧､繝ｳ縺ｯ繝繝・す繝･繝懊・繝峨↓遘ｻ蜍・
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('險ｱ蜿ｯ縺輔ｌ縺溯ｪ崎ｨｼ譁ｹ豕輔〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・oogle縺ｧ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・), '隱崎ｨｼ繧ｨ繝ｩ繝ｼ');
    }
    
    // 髢狗匱迺ｰ蠅・〒縺ｯ localStorage 縺ｫ菫晏ｭ・
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };

  // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ隱崎ｨｼ謌仙粥譎ゑｼ域侭驥代・繝ｩ繝ｳ繝壹・繧ｸ縺ｸ隱伜ｰ趣ｼ・
  const handleNewUserAuthSuccess = (user: User) => {
    const validProvider = checkAuthProvider(user);
    setIsValidAuthProvider(validProvider);
    setUserData(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
    
    if (validProvider) {
      setCurrentPage('pricing'); // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ縺ｯ譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ隱伜ｰ・
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('險ｱ蜿ｯ縺輔ｌ縺溯ｪ崎ｨｼ譁ｹ豕輔〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・oogle縺ｧ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・), '隱崎ｨｼ繧ｨ繝ｩ繝ｼ');
    }
    
    // 髢狗匱迺ｰ蠅・〒縺ｯ localStorage 縺ｫ菫晏ｭ・
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
      setCurrentPage('dashboard'); // 逋ｻ骭ｲ螳御ｺ・ｾ後・繝繝・す繝･繝懊・繝峨↓遘ｻ蜍・
    } else {
      setCurrentPage('landing');
      handleApiError(new Error('險ｱ蜿ｯ縺輔ｌ縺溯ｪ崎ｨｼ譁ｹ豕輔〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・oogle縺ｧ繝ｭ繧ｰ繧､繝ｳ縺励※縺上□縺輔＞縲・), '隱崎ｨｼ繧ｨ繝ｩ繝ｼ');
    }
    
    // 髢狗匱迺ｰ蠅・〒縺ｯ localStorage 縺ｫ菫晏ｭ・
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      localStorage.setItem('dev_user', JSON.stringify(user));
      localStorage.setItem('dev_logged_in', 'true');
    }
  };

  // 隱崎ｨｼ謌仙粥蠕後↓譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ隱伜ｰ趣ｼ・ewRegistrationModal逕ｨ・・
  const handleAuthSuccessForPricing = (authData: any) => {
    console.log('handleAuthSuccessForPricing螳溯｡・', authData);
    console.log('迴ｾ蝨ｨ縺ｮisNewUserRegistration繝輔Λ繧ｰ:', isNewUserRegistration);
    setIsNewUserRegistration(true); // 譁ｰ隕上Θ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ繝輔Λ繧ｰ繧定ｨｭ螳・
    console.log('繝輔Λ繧ｰ繧稚rue縺ｫ險ｭ螳壼ｮ御ｺ・);
    setCurrentPage('pricing'); // 逶ｴ謗･譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ驕ｷ遘ｻ
    console.log('譁咎≡繝励Λ繝ｳ繝壹・繧ｸ縺ｫ驕ｷ遘ｻ');
    setShowRegistrationModal(false); // 繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ
    console.log('繝｢繝ｼ繝繝ｫ繧帝哩縺倥ｋ');
  };


  const handleLogout = async () => {
    console.log('handleLogout髢｢謨ｰ縺悟他縺ｰ繧後∪縺励◆');
    console.log('迴ｾ蝨ｨ縺ｮ迥ｶ諷・', { isLoggedIn, currentPage, userData: userData?.email });
    
    try {
      // 髢狗匱迺ｰ蠅・〒縺ｯ localStorage 繧偵け繝ｪ繧｢
      if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
        console.log('髢狗匱迺ｰ蠅・ localStorage 繧偵け繝ｪ繧｢');
        localStorage.removeItem('dev_user');
        localStorage.removeItem('dev_logged_in');
        console.log('localStorage 繧ｯ繝ｪ繧｢螳御ｺ・);
      } else {
        console.log('譛ｬ逡ｪ迺ｰ蠅・ Supabase auth.signOut 螳溯｡・);
        await auth.signOut();
      }
      
      console.log('繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・ 迥ｶ諷九ｒ繝ｪ繧ｻ繝・ヨ');
      setIsLoggedIn(false);
      setUserData(null);
      setIsValidAuthProvider(false);
      setCurrentPage('landing'); // 繝ｭ繧ｰ繧｢繧ｦ繝亥ｾ後・繧ｪ繝ｪ繧ｸ繝翫ΝLP縺ｫ遘ｻ蜍・
      console.log('繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・ｮ御ｺ・ LP縺ｫ驕ｷ遘ｻ');
      
    } catch (error) {
      console.error('繝ｭ繧ｰ繧｢繧ｦ繝医お繝ｩ繝ｼ:', error);
      if (!(import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development')) {
        handleApiError(error, '繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・);
      }
    }
  };

  const renderContent = () => {
    console.log('renderContent called:', { isLoggedIn, currentPage, isLoading });
    
    
    if (!isLoggedIn && !publicPages.has(currentPage)) {
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
            onAuthRequest={handleAuthRequest}
            onTrialRequest={handleRegistrationRequest}
            onPurchaseRequest={handlePurchaseRequest}
            onContactRequest={handleContactRequest}
          />
        );
      } else if (currentPage === 'landing') {
        // 蠕捺擂縺ｮLP繧定｡ｨ遉ｺ・磯ｻ定レ譎ｯ・・
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

    // 繝ｭ繧ｰ繧､繝ｳ貂医∩譎・ 蜍慕判繝励Λ繝・ヨ繝輔か繝ｼ繝
    // Google隱崎ｨｼ縺ｮ縺ｿ繧｢繧ｯ繧ｻ繧ｹ險ｱ蜿ｯ
    if (!isValidAuthProvider && !publicPages.has(currentPage)) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-8">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">笞・・/span>
            </div>
            <h2 className="text-2xl font-bold mb-4">繧｢繧ｯ繧ｻ繧ｹ縺悟宛髯舌＆繧後※縺・∪縺・/h2>
            <p className="text-gray-400 mb-6 leading-relaxed">
              AI Creative Stock縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺ｫ縺ｯ縲；oogle縺ｾ縺溘・Apple ID縺ｧ縺ｮ繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺吶・
            </p>
            <button 
              onClick={handleLogout}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
            >
              繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ謌ｻ繧・
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
      case 'refund':
        return <RefundPolicy onPageChange={handlePageChange} />;
      case 'commercial':
        return <CommercialTransaction onPageChange={handlePageChange} />;
      case 'contact':
        return <Contact onPageChange={handlePageChange} />;
      default:
        return <Dashboard />; // 繝・ヵ繧ｩ繝ｫ繝医・繝繝・す繝･繝懊・繝・
    }
  };

  // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ荳ｭ縺ｮ陦ｨ遉ｺ
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
        </div>
      </div>
    );
  }

  // SEO繝・・繧ｿ繧貞叙蠕・
  const pageType = getPageType(currentPage);
  const seoData = pageType ? pageSEOData[pageType] : pageSEOData.dashboard;
  const pathname = currentPage === 'landing' ? '/' : `/${currentPage}`;

  return (
    <HelmetProvider>
      <ErrorBoundary onError={(error, errorInfo) => {
        handleApiError(error, '繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ');
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
                    onTrialRequest={handleRegistrationRequest}
                    onLogout={handleLogout}
                    userData={userData}
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
