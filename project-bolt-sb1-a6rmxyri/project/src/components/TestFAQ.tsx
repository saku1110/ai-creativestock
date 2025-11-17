import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TestFAQ: React.FC = () => {
  const [openItem, setOpenItem] = useState<number | null>(null);

  const faqData = [
    {
      question: "AIで生成された動画の品質はどの程度ですか？",
      answer: "当社のAI技術は実写と見分けがつかないレベルの高品質動画を生成します。プロの映像制作チームによる品質チェックを経て、マーケティング用途に最適化された動画のみを提供しています。"
    },
    {
      question: "商用利用に関して追加料金は発生しますか？",
      answer: "いいえ、一切発生しません。ダウンロードした動画は完全に商用利用可能で、追加のライセンス料金や利用制限はありません。広告、プロモーション、SNS投稿など自由にご利用ください。"
    },
    {
      question: "リクエストした動画はどこに納品されますか？",
      answer: "スタンダード、プロ、ビジネスプランでは、リクエストいただいた動画はダッシュボードにアップロードされ、他のユーザーも使用できる共有素材として提供されます。個別に納品をご希望の場合は、エンタープライズプランをご利用ください。エンタープライズプランでは、お客様専用の動画として制作・納品いたします。"
    },
    {
      question: "どのような業界向けの動画がありますか？",
      answer: "美容・コスメ、フィットネス・ダイエット、ヘルスケア、ビジネス・B2B、ライフスタイル、ECなど幅広い業界をカバーしています。それぞれの業界特性に最適化された動画を豊富に取り揃えています。"
    },
    {
      question: "動画のフォーマットや解像度は選択できますか？",
      answer: "全ての動画は9:16の縦型フォーマットで提供され、Instagram、TikTok、YouTube Shortsなどのモバイル向けSNSに最適化されています。高解像度（HD）での配信となります。"
    },
    {
      question: "月間ダウンロード制限を超えた場合はどうなりますか？",
      answer: "プラン変更により追加ダウンロードが可能です。また、翌月には制限がリセットされます。お客様の利用状況に応じて、最適なプランへのアップグレードをご提案いたします。"
    },
    {
      question: "サポート体制について教えてください",
      answer: "全プランでメールサポートを提供、プロプラン以上では優先サポート、ビジネスプランでは24時間サポートをご利用いただけます。動画選択から活用方法まで専門スタッフがサポートします。"
    },
    {
      question: "契約期間の縛りはありますか？",
      answer: "月額プランは1ヶ月単位、年額プランは1年単位での契約となります。自動更新ですが、いつでもキャンセル可能で、違約金等は一切発生しません。"
    }
  ];

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
              よくあるご質問
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            AI Creative Stockについてのご質問にお答えします
          </p>
        </div>

        {/* FAQ リスト */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div key={index} className="group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 hover:border-gray-600 transition-all duration-300">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-6 text-left flex items-center justify-between"
                >
                  <h3 className="text-lg font-semibold text-white pr-4">
                    {item.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openItem === index ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </button>
                
                {openItem === index && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-gray-700 pt-4">
                      <p className="text-gray-300 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* サポート情報 */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-2xl p-8 border border-blue-500/20">
            <h3 className="text-xl font-bold text-white mb-4">
              他にご質問がございますか？
            </h3>
            <p className="text-gray-400 mb-6">
              お気軽にお問い合わせください。専門スタッフが丁寧にサポートいたします。
            </p>
            <div className="flex justify-center">
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestFAQ;
