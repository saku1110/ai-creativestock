import React, { useState, useEffect } from 'react';
import SimpleHero from './SimpleHero';
import SimpleProblem from './SimpleProblem';
import SimpleSolution from './SimpleSolution';
import SimpleBenefits from './SimpleBenefits';
import SimpleTestimonials from './SimpleTestimonials';
import SimplePricing from './SimplePricing';
import SimpleCTA from './SimpleCTA';
import AuthModal from '../AuthModal';
import { Shield, Lock, CreditCard } from 'lucide-react';

interface SimpleLandingPageProps {
  onAuthRequest?: () => void;
  showAuthModal?: boolean;
  setShowAuthModal?: (show: boolean) => void;
}

const SimpleLandingPage: React.FC<SimpleLandingPageProps> = ({ 
  onAuthRequest,
  showAuthModal = false,
  setShowAuthModal = () => {}
}) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [localShowAuthModal, setLocalShowAuthModal] = useState(showAuthModal);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setLocalShowAuthModal(showAuthModal);
  }, [showAuthModal]);

  const handleAuthRequest = () => {
    if (onAuthRequest) {
      onAuthRequest();
    } else {
      setLocalShowAuthModal(true);
    }
  };

  const handleCloseAuthModal = () => {
    setLocalShowAuthModal(false);
    setShowAuthModal(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* プログレスバー */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold">AI Creative Stock</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#problem" className="text-gray-600 hover:text-gray-900">課題</a>
              <a href="#solution" className="text-gray-600 hover:text-gray-900">解決策</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900">メリット</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">料金</a>
              <button
                onClick={handleAuthRequest}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                今すぐ始める
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pt-16">
        <SimpleHero onAuthRequest={handleAuthRequest} />
        
        <div id="problem">
          <SimpleProblem />
        </div>
        
        <div id="solution">
          <SimpleSolution />
        </div>
        
        <div id="benefits">
          <SimpleBenefits />
        </div>
        
        <SimpleTestimonials />
        
        <div id="pricing">
          <SimplePricing onSelectPlan={handleAuthRequest} />
        </div>
        
        <SimpleCTA onAuthRequest={handleAuthRequest} />
      </main>

      {/* フッター */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-gray-600">© 2025 AI Creative Stock. All rights reserved.</p>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                <span>SSL保護</span>
              </div>
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-1" />
                <span>プライバシー保護</span>
              </div>
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 mr-1" />
                <span>安全な決済</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 認証モーダル */}
      {localShowAuthModal && (
        <AuthModal 
          isOpen={localShowAuthModal}
          onClose={handleCloseAuthModal}
        />
      )}
    </div>
  );
};

export default SimpleLandingPage;
