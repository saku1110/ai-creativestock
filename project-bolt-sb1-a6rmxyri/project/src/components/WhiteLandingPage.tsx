import React from 'react';
import Hero from './Hero';
import ProblemMetrics from './ProblemMetrics';
import VideoGallery from './VideoGallery';
import SolutionFeatures from './SolutionFeatures';
import EfficiencyStats from './EfficiencyStats';
import TestPricing from './TestPricing';
import CustomerReviews from './CustomerReviews';
import TestFAQ from './TestFAQ';
import FinalCTA from './FinalCTA';

interface WhiteLandingPageProps {
  onAuthRequest: () => void;
  onTrialRequest: () => void;
  onPurchaseRequest: () => void;
  onContactRequest: () => void;
}

const WhiteLandingPage: React.FC<WhiteLandingPageProps> = ({
  onAuthRequest,
  onTrialRequest,
  onPurchaseRequest,
  onContactRequest
}) => {
  return (
    <div className="white-theme">
      <style>{`
        /* ベースカラー設定 */
        .white-theme {
          background-color: #FFFFFF !important;
          color: #1F2937 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', sans-serif !important;
        }
        
        /* シンプルなタイポグラフィ */
        .white-theme h1 {
          color: #111827 !important;
          font-weight: 800 !important;
          letter-spacing: -0.025em !important;
          line-height: 1.1 !important;
        }
        
        .white-theme h2 {
          color: #111827 !important;
          font-weight: 700 !important;
          letter-spacing: -0.02em !important;
          line-height: 1.2 !important;
        }
        
        .white-theme h3,
        .white-theme h4 {
          color: #374151 !important;
          font-weight: 600 !important;
          line-height: 1.3 !important;
        }
        
        .white-theme p,
        .white-theme span,
        .white-theme div {
          color: #4B5563 !important;
          line-height: 1.7 !important;
        }
        
        /* ミニマルなヘッダー */
        .white-theme header {
          background-color: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(10px) !important;
          border-bottom: 1px solid #F3F4F6 !important;
          box-shadow: none !important;
        }
        
        /* フラットなカード */
        .white-theme .bg-gray-800,
        .white-theme .bg-gray-900,
        .white-theme .bg-black {
          background-color: #FFFFFF !important;
          border: 1px solid #E5E7EB !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        }
        
        /* 細いボーダー */
        .white-theme .border-gray-700,
        .white-theme .border-gray-800 {
          border-color: #E5E7EB !important;
          border-width: 1px !important;
        }
        
        /* グラデーション削除 */
        .white-theme .bg-gradient-to-br,
        .white-theme .bg-gradient-to-r,
        .white-theme .bg-gradient-to-b {
          background: transparent !important;
        }
        
        /* シンプルなCTAボタン */
        .white-theme button {
          border-radius: 6px !important;
          font-weight: 500 !important;
          letter-spacing: -0.01em !important;
          transition: all 0.15s ease !important;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
        }
        
        .white-theme button:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* プライマリボタン */
        .white-theme .bg-gradient-to-r.from-purple-600.to-pink-600 {
          background: #111827 !important;
          color: white !important;
        }
        
        .white-theme .bg-gradient-to-r.from-purple-600.to-pink-600:hover {
          background: #1F2937 !important;
        }
        
        /* セカンダリボタン */
        .white-theme .border.border-gray-700 {
          border-color: #D1D5DB !important;
          background: white !important;
          color: #374151 !important;
        }
        
        .white-theme .border.border-gray-700:hover {
          border-color: #9CA3AF !important;
          background: #F9FAFB !important;
        }
        
        /* セクション背景 */
        .white-theme section {
          padding: 60px 0 !important;
          background-color: white !important;
        }
        
        .white-theme section:nth-child(even) {
          background-color: #FAFAFA !important;
        }
        
        /* テキストカラー調整 */
        .white-theme .text-gray-400 {
          color: #6B7280 !important;
        }
        
        .white-theme .text-gray-300 {
          color: #9CA3AF !important;
        }
        
        .white-theme .text-white {
          color: #111827 !important;
        }
        
        /* アクセントカラー */
        .white-theme .text-cyan-400,
        .white-theme .text-cyan-500 {
          color: #0891B2 !important;
        }
        
        .white-theme .text-purple-400,
        .white-theme .text-purple-500 {
          color: #7C3AED !important;
        }
        
        .white-theme .text-pink-400,
        .white-theme .text-pink-500 {
          color: #EC4899 !important;
        }
        
        /* ミニマルな影 */
        .white-theme .shadow-xl {
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
        }
        
        .white-theme .shadow-2xl {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        
        /* 角丸を控えめに */
        .white-theme .rounded-2xl {
          border-radius: 12px !important;
        }
        
        .white-theme .rounded-xl {
          border-radius: 8px !important;
        }
        
        .white-theme .rounded-lg {
          border-radius: 6px !important;
        }
        
        /* 動画カード */
        .white-theme .video-card,
        .white-theme .group {
          background-color: white !important;
          border: 1px solid #E5E7EB !important;
          overflow: hidden !important;
        }
        
        .white-theme .group:hover {
          border-color: #D1D5DB !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* FAQ */
        .white-theme .faq-item,
        .white-theme details {
          background-color: white !important;
          border: 1px solid #E5E7EB !important;
          margin-bottom: 8px !important;
        }
        
        .white-theme summary {
          font-weight: 500 !important;
          color: #111827 !important;
        }
        
        /* 価格カード */
        .white-theme .pricing-card,
        .white-theme .relative.p-8 {
          background-color: white !important;
          border: 1px solid #E5E7EB !important;
        }
        
        .white-theme .pricing-card.recommended,
        .white-theme .border-purple-500 {
          border-color: #111827 !important;
          border-width: 2px !important;
        }
        
        /* 統計カード */
        .white-theme .stat-card,
        .white-theme .text-center {
          background-color: transparent !important;
          border: none !important;
        }
        
        /* アイコン調整 */
        .white-theme svg {
          stroke-width: 1.5 !important;
        }
        
        /* ホバーエフェクトを控えめに */
        .white-theme *:hover {
          transition-duration: 0.15s !important;
        }
        
        /* アニメーションを控えめに */
        .white-theme * {
          animation-duration: 0.3s !important;
        }
        
        /* プログレスバー */
        .white-theme .bg-cyan-500 {
          background: #111827 !important;
        }
        
        /* バッジ */
        .white-theme .bg-purple-600,
        .white-theme .bg-cyan-600 {
          background: #111827 !important;
          color: white !important;
        }
        
        /* リンク */
        .white-theme a {
          color: #111827 !important;
          text-decoration: none !important;
        }
        
        .white-theme a:hover {
          color: #4B5563 !important;
        }
        
        /* フォームフィールド */
        .white-theme input,
        .white-theme textarea,
        .white-theme select {
          background: white !important;
          border: 1px solid #E5E7EB !important;
          color: #111827 !important;
        }
        
        .white-theme input:focus,
        .white-theme textarea:focus,
        .white-theme select:focus {
          border-color: #111827 !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.05) !important;
        }
        
        /* スクロールバー */
        .white-theme::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        
        .white-theme::-webkit-scrollbar-track {
          background: #F9FAFB !important;
        }
        
        .white-theme::-webkit-scrollbar-thumb {
          background: #D1D5DB !important;
          border-radius: 4px !important;
        }
        
        .white-theme::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF !important;
        }
      `}</style>
      
      <Hero 
        onAuthRequest={onTrialRequest} 
        onPurchaseRequest={onPurchaseRequest} 
      />
      <ProblemMetrics />
      <SolutionFeatures />
      <EfficiencyStats />
      <VideoGallery onTrialRequest={onTrialRequest} />
      <TestPricing 
        onTrialRequest={onTrialRequest} 
        onPurchaseRequest={onPurchaseRequest} 
      />
      <CustomerReviews />
      <TestFAQ />
      <FinalCTA 
        onTrialRequest={onTrialRequest} 
        onContactRequest={onContactRequest} 
        onPurchaseRequest={onPurchaseRequest} 
      />
    </div>
  );
};

export default WhiteLandingPage;