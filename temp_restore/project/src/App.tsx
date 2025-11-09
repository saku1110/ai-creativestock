import React from 'react';
import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProblemSection from './components/ProblemSection';
import VideoSamplesSection from './components/VideoSamplesSection';
import SolutionSection from './components/SolutionSection';
import VideoGrid from './components/VideoGrid';
import PricingSection from './components/PricingSection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import MyPage from './components/MyPage';
import AuthModal from './components/AuthModal';
import ContactModal from './components/ContactModal';
import { signInWithGoogle, signInWithApple, AuthUser } from './auth/mockAuth';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'dashboard' | 'mypage'
  const [isLoggedIn, setIsLoggedIn] = useState(false); // デモ用：ログイン状態
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [userData, setUserData] = useState<AuthUser | null>(null);

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  const handleAuthRequest = () => {
    setShowAuthModal(true);
  };

  const handleContactRequest = () => {
    setShowContactModal(true);
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setUserData(user);
    setIsLoggedIn(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    setCurrentPage('home');
  };
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return isLoggedIn ? <Dashboard /> : <div>ログインが必要です</div>;
      case 'mypage':
        return isLoggedIn ? <MyPage /> : <div>ログインが必要です</div>;
      default:
        return (
          <>
            <Hero onAuthRequest={handleAuthRequest} />
            <ProblemSection />
            <VideoSamplesSection onAuthRequest={handleAuthRequest} onContactRequest={handleContactRequest} />
            <SolutionSection onAuthRequest={handleAuthRequest} onContactRequest={handleContactRequest} />
            {isLoggedIn && <VideoGrid onAuthRequest={handleAuthRequest} isLoggedIn={isLoggedIn} />}
            {!isLoggedIn && <PricingSection onAuthRequest={handleAuthRequest} />}
            {!isLoggedIn && <PricingSection onAuthRequest={handleAuthRequest} onContactRequest={handleContactRequest} />}
            <CTASection onAuthRequest={handleAuthRequest} onContactRequest={handleContactRequest} />
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="tech-grid min-h-screen">
        <Header 
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isLoggedIn={isLoggedIn}
          onAuthRequest={handleAuthRequest}
          onLogout={handleLogout}
          userData={userData}
        />
        {renderPage()}
        <Footer />
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
          signInWithGoogle={signInWithGoogle}
          signInWithApple={signInWithApple}
        />
        
        <ContactModal
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      </div>
    </div>
  );
}

export default App;