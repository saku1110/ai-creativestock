import React from 'react';

const CustomerReviews: React.FC = () => {
  const reviews = [
    {
      name: "匿名希望",
      company: "",
      role: "マーケティング部長",
      comment: "従来の動画制作では1本あたり50万円かかっていましたが、AI Creative Stockを使うことで月額5万円以下で30本以上の高品質動画を確保できています。CVRも2倍に向上しました。",
      industry: "美容・コスメ"
    },
    {
      name: "匿名希望",
      company: "",
      role: "代表取締役",
      comment: "ジムの会員獲得広告にAI動画を活用したところ、Instagram広告のエンゲージメント率が従来の3倍になりました。特に9:16フォーマットがSNSに最適で、制作時間も劇的に短縮されました。",
      industry: "フィットネス"
    },
    {
      name: "匿名希望",
      company: "",
      role: "クリエイティブディレクター",
      comment: "クライアント案件で常に新鮮な動画素材が必要でしたが、AI Creative Stockのおかげで企画から配信まで最短1日で完了できるようになりました。品質も実写と変わらないレベルです。",
      industry: "広告代理店"
    },
    {
      name: "匿名希望",
      company: "",
      role: "マーケティングマネージャー",
      comment: "健康食品のプロモーション動画制作に利用しています。ターゲット層に刺さる動画を短期間で大量に作成でき、A/Bテストも効率的に実施できています。ROIが格段に向上しました。",
      industry: "健康食品メーカー"
    },
    {
      name: "匿名希望",
      company: "",
      role: "広告運用担当",
      comment: "Meta広告やGoogle広告で動画クリエイティブのテストを繰り返していますが、AI Creative Stockのおかげで週に10パターン以上の動画を作成できるようになりました。CPAが30%改善しました。",
      industry: "広告運用"
    },
    {
      name: "匿名希望",
      company: "",
      role: "TikTokクリエイター",
      comment: "TikTokでのバズり動画制作に活用しています。縦型9:16の動画素材が豊富で、編集時間が大幅に短縮。フォロワーも3ヶ月で5万人増えました。AI動画でもエンゲージメントは実写と変わりません。",
      industry: "TikTok運用"
    },
    {
      name: "匿名希望",
      company: "",
      role: "バーチャルインフルエンサー運営",
      comment: "SNS投稿用のコンテンツ制作にAI動画を活用しています。実写撮影の必要がなく、ブランドイメージに合った動画を自由に作成できるのが魅力です。フォロワーの反応も上々で、月間リーチ数が2倍になりました。",
      industry: "バーチャルインフルエンサー"
    },
    {
      name: "匿名希望",
      company: "",
      role: "代表取締役",
      comment: "クライアントのTikTok運用代行で常に新鮮なコンテンツが求められますが、AI Creative Stockのおかげで制作コストを70%削減しながら、週5本以上の高品質動画を配信できています。クライアント満足度も大幅に向上しました。",
      industry: "TikTok運用代行会社"
    },
    {
      name: "匿名希望",
      company: "",
      role: "アフィリエイター",
      comment: "マッチングアプリやアダルト系商材のオーガニック投稿用動画制作に活用しています。モデル撮影が不要で、TikTokやInstagramに毎日投稿できる素材が手に入ります。コスパよく投稿頻度を上げられたことで、成約数が2倍以上になり大幅に利益が増えました。",
      industry: "アフィリエイト"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              お客様の声
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            AI Creative Stockを実際にご利用いただいているお客様からの生の声
          </p>
        </div>

        {/* レビューグリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <div key={index} className="group">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:scale-105 h-full flex flex-col">
                
                {/* 業界タグ */}
                <div className="mb-4">
                  <span className="inline-block bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium border border-blue-500/30">
                    {review.industry}
                  </span>
                </div>

                {/* クォートマーク */}
                <div className="mb-4">
                  <div className="text-4xl text-gray-600 font-serif leading-none">"</div>
                </div>

                {/* コメント */}
                <blockquote className="text-gray-300 text-sm leading-relaxed mb-6 flex-grow">
                  {review.comment}
                </blockquote>

                {/* 顧客情報 */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="text-gray-400 text-xs">
                    {review.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 統計サマリー */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-green-500/10 to-blue-600/10 rounded-3xl p-8 border border-green-500/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-black text-green-400 mb-2">1000+</div>
                <div className="text-gray-400">満足いただいているお客様</div>
              </div>
              <div>
                <div className="text-3xl font-black text-blue-400 mb-2">2.4倍</div>
                <div className="text-gray-400">平均CVR向上率</div>
              </div>
              <div>
                <div className="text-3xl font-black text-purple-400 mb-2">90%</div>
                <div className="text-gray-400">コスト削減実績</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews;