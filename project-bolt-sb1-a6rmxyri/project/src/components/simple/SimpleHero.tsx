import React from 'react';
import { ArrowDown, Users, Star, TrendingUp } from 'lucide-react';

interface SimpleHeroProps {
  onAuthRequest: () => void;
}

const SimpleHero: React.FC<SimpleHeroProps> = ({ onAuthRequest }) => {
  return (
    <section className="relative bg-white pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* 信頼バッジ */}
        <div className="flex justify-center items-center space-x-6 mb-8">
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-1" />
            <span>10,000+利用者</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Star className="w-4 h-4 mr-1 text-yellow-500" />
            <span>4.9/5.0評価</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
            <span>CVR3倍向上</span>
          </div>
        </div>

        {/* メインメッセージ */}
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          AI動画素材で
          <br />
          広告制作を10倍速に
        </h1>

        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          プロ品質のAI動画素材が月額14,800円で月20本ダウンロード可能。
          制作時間を90%削減し、成果を3倍に。
        </p>

        {/* CTAボタン */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
          onClick={onAuthRequest}
          className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-medium text-lg hover:bg-indigo-700 transition-colors"
        >
          今すぐ始める
        </button>
          <button
            onClick={onAuthRequest}
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-medium text-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            デモを見る
          </button>
        </div>

        {/* 保証テキスト */}
        <p className="text-sm text-gray-500 mb-12">
          クレジットカード不要・いつでも解約可能・返金保証付き
        </p>

        {/* プロダクトモックアップ */}
        <div className="relative max-w-3xl mx-auto mb-12">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 shadow-xl">
            <div className="aspect-video bg-white rounded-lg shadow-inner flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-600">高品質AI動画素材のプレビュー</p>
              </div>
            </div>
          </div>
        </div>

        {/* スクロール促進 */}
        <div className="animate-bounce">
          <ArrowDown className="w-6 h-6 text-gray-400 mx-auto" />
        </div>
      </div>
    </section>
  );
};

export default SimpleHero;
