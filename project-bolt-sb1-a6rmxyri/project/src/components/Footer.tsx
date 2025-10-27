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
          {/* 莨夂､ｾ諠・ｱ */}
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
              鬮伜刀雉ｪ縺ｪSNS蜍慕判蠎・相邏譚舌ｒ謠蝉ｾ帙☆繧区律譛ｬ譛螟ｧ邏壹・繝励Ξ繝溘い繝繝槭・繧ｱ繝・ヨ繝励Ξ繧､繧ｹ縲・              鄒主ｮｹ繝ｻ繝繧､繧ｨ繝・ヨ繝ｻ繝倥い繧ｱ繧｢繝ｻ繝薙ず繝阪せ繝ｻ繝ｩ繧､繝輔せ繧ｿ繧､繝ｫ縺ｮ蜷・･ｭ逡悟髄縺大虚逕ｻ蠎・相蛻ｶ菴懊ｒ謾ｯ謠ｴ縺励∪縺吶・            </p>
          </div>
          
          {/* 繧ｵ繝昴・繝・*/}
          <div>
            <h4 className="text-lg sm:text-xl font-bold text-white mb-6 sm:mb-8 flex items-center space-x-2">
              <Cpu className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400" />
              <span>繧ｵ繝昴・繝・/span>
            </h4>
            <ul className="space-y-3 sm:space-y-4">
              {[{ name: "お問い合わせ", href: "/contact" },{ name: "利用規約", href: "/terms" },{ name: "プライバシーポリシー", href: "/privacy" },{ name: "返金ポリシー", href: "/refund" },{ name: "特定商取引法に基づく表記", href: "/commercial" }].map((item, index) => (
                <li key={index}>
                  <a href={item.href} className="text-gray-400 hover:text-cyan-400 transition-colors font-medium text-sm sm:text-base">{item.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 繧ｳ繝斐・繝ｩ繧､繝・*/}
        <div className="border-t border-white/10 mt-12 sm:mt-16 pt-6 sm:pt-8 text-center text-gray-400">
          <p className="text-xs sm:text-sm">&copy; 2024 AI Creative Stock. All rights reserved. | 豎ｺ貂亥・逅・ Stripe | Creative Video Asset Specialists</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
