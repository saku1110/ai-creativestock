import React from 'react';
import { Play, Sparkles, TrendingUp, ArrowRight, Star, Zap, Cpu, Database } from 'lucide-react';

interface HeroProps {
  onAuthRequest: () => void;
}

const Hero: React.FC<HeroProps> = ({ onAuthRequest }) => {
  return (
    <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0">
        <div className="absolute top-10 sm:top-20 left-5 sm:left-10 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 bg-gradient-to-r from-cyan-400/20 to-purple-600/20 rounded-full filter blur-3xl animate-float"></div>
        <div className="absolute top-20 sm:top-40 right-5 sm:right-10 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 bg-gradient-to-r from-purple-600/20 to-pink-500/20 rounded-full filter blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-4 sm:-bottom-8 left-10 sm:left-20 w-48 sm:w-72 lg:w-96 h-48 sm:h-72 lg:h-96 bg-gradient-to-r from-blue-500/20 to-cyan-400/20 rounded-full filter blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* バッジ */}
          <div className="flex justify-center mb-8 sm:mb-12">
            <div className="glass-effect text-cyan-400 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-full text-xs sm:text-sm font-medium border border-cyan-400/30 shadow-2xl hologram max-w-full">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Cpu className="w-4 sm:w-5 h-4 sm:h-5 animate-pulse flex-shrink-0" />
                <span className="text-center">実写級・高品質・SNS特化・9:16縦型・4K</span>
                <div className="flex items-center space-x-1 ml-2 sm:ml-3 flex-shrink-0">
                  <Star className="w-3 sm:w-4 h-3 sm:h-4 fill-current text-yellow-400" />
                  <span className="text-xs sm:text-sm font-bold">4.9</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* メインタイトル */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl xl:text-8xl font-black mb-6 sm:mb-8 leading-tight">
            <span className="block text-white">高品質</span>
            <span className="block gradient-text animate-pulse-slow">SNS広告動画素材</span>
            <span className="block text-white">マーケットプレイス</span>
          </h1>
          
          {/* サブタイトル */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed px-4">
            実写級の美しさでCVRを最大化する
            <br className="hidden sm:block" />
            <span className="text-cyan-400 font-semibold">高品質SNS動画広告素材</span>を
            <span className="text-cyan-400 font-semibold">1,000点以上</span>取り揃えています
          </p>
          
          {/* CTA ボタン */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center mb-12 sm:mb-16 lg:mb-20 px-4">
            <button 
              onClick={onAuthRequest}
              className="group cyber-button text-white px-6 sm:px-8 lg:px-10 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 flex items-center space-x-2 sm:space-x-3 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 w-full sm:w-auto"
            >
              <Play className="w-5 sm:w-6 h-5 sm:h-6 flex-shrink-0" />
              <span className="text-sm sm:text-base">実写級動画広告素材を探索</span>
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-2 transition-transform flex-shrink-0" />
            </button>
            <button 
              onClick={onAuthRequest}
              className="group glass-effect border-2 border-cyan-400/30 text-cyan-400 hover:text-white px-6 sm:px-8 lg:px-10 py-4 sm:py-5 rounded-2xl font-bold transition-all duration-300 hover:bg-cyan-400/10 w-full sm:w-auto"
            >
              <span className="text-sm sm:text-base">料金プランを見る</span>
            </button>
          </div>
          
          {/* 統計情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto px-4">
            <div className="text-center group">
              <div className="glass-effect neon-border w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl group-hover:shadow-cyan-500/25 transition-all duration-500 hover-lift">
                <Database className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-cyan-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">1000+</h3>
              <p className="text-sm sm:text-base text-gray-400 font-medium">毎月300動画追加</p>
            </div>
            
            <div className="text-center group">
              <div className="glass-effect neon-border w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-500 hover-lift">
                <Zap className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-purple-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">高CVR</h3>
              <p className="text-sm sm:text-base text-gray-400 font-medium">広告効果実証済み</p>
            </div>
            
            <div className="text-center group">
              <div className="glass-effect neon-border w-16 sm:w-20 lg:w-24 h-16 sm:h-20 lg:h-24 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-2xl group-hover:shadow-green-500/25 transition-all duration-500 hover-lift">
                <TrendingUp className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 text-green-400" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">9:16縦型動画</h3>
              <p className="text-sm sm:text-base text-gray-400 font-medium">SNS最適化フォーマット</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;