import React from 'react';
import { Zap, Cpu } from 'lucide-react';

interface FooterProps {
  onPageChange?: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onPageChange }) => {
  const handleLinkClick = (page: string) => {
    if (onPageChange) {
      onPageChange(page);
    }
  };

  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* 会社情報 */}
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
              高品質なSNS動画広告素材を提供する日本最大級のプレミアムマーケットプレイス。
              美容・ダイエット・ヘアケア・ビジネス・ライフスタイルの各業界向け動画広告制作を支援します。
            </p>
          </div>
          
          {/* サポート */}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white mb-6 sm:mb-8 flex items-center space-x-2">
              <Cpu className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
              <span>サポート</span>
            </h4>
            <ul className="space-y-3 sm:space-y-4">
              {[
                'お問い合わせ',
                { name: '利用規約', page: 'terms' },
                { name: 'プライバシーポリシー', page: 'privacy' }
              ].map((item, index) => (
                <li key={index}>
                  {typeof item === 'string' ? (
                    <a href="#" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium text-sm sm:text-base">
                      {item}
                    </a>
                  ) : (
                    <button
                      onClick={() => handleLinkClick(item.page)}
                      className="text-gray-400 hover:text-cyan-400 transition-colors font-medium text-sm sm:text-base text-left"
                    >
                      {item.name}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* コピーライト */}
        <div className="border-t border-white/10 mt-12 sm:mt-16 pt-6 sm:pt-8 text-center text-gray-400">
          <p className="text-xs sm:text-sm">&copy; 2024 AI Creative Stock. All rights reserved. | 決済処理: Stripe | Creative Video Asset Specialists</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
