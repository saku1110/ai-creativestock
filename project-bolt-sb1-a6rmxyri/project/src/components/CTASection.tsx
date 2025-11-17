import React from 'react';
import { Play, FileText, MessageCircle, Phone, Mail, MessageSquare } from 'lucide-react';

interface CTASectionProps {
  onAuthRequest: () => void;
  onContactRequest: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onAuthRequest, onContactRequest }) => {
  const secondaryCTAs = [
    {
      icon: Play,
      title: '製品デモを見る',
      description: '30分のライブデモ',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: FileText,
      title: '資料ダウンロード',
      description: '詳細な製品資料',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: MessageCircle,
      title: 'お問い合わせ',
      description: '専門スタッフによる相談',
      color: 'from-green-500 to-green-600',
      action: 'contact'
    }
  ];

  const contactInfo = [
    {
      icon: Phone,
      title: '電話',
      info: '0120-xxx-xxx',
      subInfo: '平日9:00-18:00'
    },
    {
      icon: Mail,
      title: 'メール',
      info: 'support@ai-creativestock.com',
      subInfo: '24時間受付'
    },
    {
      icon: MessageSquare,
      title: 'チャット',
      info: 'サイト右下のチャットボタン',
      subInfo: 'リアルタイム対応'
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* メインCTA */}
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-6">
            <span className="gradient-text">今すぐ始める</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 mb-8 sm:mb-12 max-w-3xl mx-auto">
            高品質AI動画素材で広告成約率を最大化しましょう
          </p>
          
          <div className="mb-8 sm:mb-12">
            <button 
              onClick={onAuthRequest}
              className="cyber-button text-white px-12 sm:px-16 lg:px-20 py-6 sm:py-8 rounded-3xl font-black transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 text-xl sm:text-2xl lg:text-3xl"
            >
              今すぐ実写級動画を使う
            </button>
          </div>
          
          <p className="text-gray-500 text-sm sm:text-base">
            すぐに利用開始、いつでも解約可能
          </p>
        </div>

        {/* セカンダリCTA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-20">
          {secondaryCTAs.map((cta, index) => {
            const IconComponent = cta.icon;
            return (
              <div key={index} className="glass-effect rounded-2xl p-6 sm:p-8 border border-white/10 hover-lift text-center bg-gray-800/50">
                <div className={`w-16 h-16 bg-gradient-to-br ${cta.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{cta.title}</h3>
                <p className="text-gray-400 mb-6">{cta.description}</p>
                {cta.action === 'contact' ? (
                  <a
                    href="/contact"
                    className="block w-full glass-effect border border-cyan-600/30 text-cyan-400 hover:text-white py-3 px-6 rounded-xl transition-all duration-300 font-bold hover:bg-cyan-600/10 bg-gray-800/50 text-center"
                  >
                    詳細を見る
                  </a>
                ) : (
                  <button
                    onClick={onAuthRequest}
                    className="w-full glass-effect border border-cyan-600/30 text-cyan-400 hover:text-white py-3 px-6 rounded-xl transition-all duration-300 font-bold hover:bg-cyan-600/10 bg-gray-800/50"
                  >
                    詳細を見る
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* お問い合わせ情報 */}
        <div className="glass-effect rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl bg-gray-800/50">
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-8 sm:mb-12">
            お問い合わせ
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {contactInfo.map((contact, index) => {
              const IconComponent = contact.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{contact.title}</h4>
                  <p className="text-cyan-400 font-medium mb-1">{contact.info}</p>
                  <p className="text-gray-400 text-sm">{contact.subInfo}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
