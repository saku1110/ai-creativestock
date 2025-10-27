import React from 'react';
import { Zap, Cpu } from 'lucide-react';

interface FooterProps {
  onPageChange?: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onPageChange }) => {
  const handleLinkClick = (e: React.MouseEvent, page: string) => {
    // SPA内遷移に切り替え（スクロール位置の維持/最下部開始の回避）
    if (onPageChange) {
      e.preventDefault();
      onPageChange(page);
    }
  };

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* ブランド */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4 sm:mb-6">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center animate-glow">
                <Zap className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black gradient-text">
                  AI Creative Stock
                </h3>
                <p className="text-xs sm:text-sm text-gray-400">Creative Video Assets</p>
              </div>
            </div>
            <p className="text-gray-400 max-w-md leading-relaxed text-sm sm:text-base">
              クリエイターのための高品質な縦型動画素材を提供します。
              商用利用可能なアセットで、制作をもっとスムーズに。
            </p>
          </div>
          
          {/* サポート */}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white mb-6 sm:mb-8 flex items-center space-x-2">
              <Cpu className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
              <span>サポート</span>
            </h4>
            <ul className="space-y-3 sm:space-y-4">
              {[{ name: "お問い合わせ", href: "/contact", page: 'contact' },{ name: "利用規約", href: "/terms", page: 'terms' },{ name: "プライバシーポリシー", href: "/privacy", page: 'privacy' },{ name: "返金ポリシー", href: "/refund", page: 'refund' },{ name: "特定商取引法に基づく表記", href: "/commercial", page: 'commercial' }].map((item, index) => (
                <li key={index}>
                  <a
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.page)}
                    className="text-gray-400 hover:text-cyan-400 transition-colors font-medium text-sm sm:text-base"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* フッター */}
        <div className="border-t border-white/10 mt-12 sm:mt-16 pt-6 sm:pt-8 text-center text-gray-400">
          <p className="text-xs sm:text-sm">&copy; 2024 AI Creative Stock. All rights reserved. | Powered by Stripe | Creative Video Asset Specialists</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
