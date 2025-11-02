import React from 'react';
import { Check, X } from 'lucide-react';

const ComparisonTable: React.FC = () => {
  const features = [
    {
      feature: '制作コスト',
      realLife: '1本1万円〜10万円',
      ai: '月額9,800円~',
      aiWin: true
    },
    {
      feature: '制作期間',
      realLife: '企画から納品まで1週間〜1ヶ月',
      ai: '即日利用可能',
      aiWin: true
    },
    {
      feature: '撮影の手間',
      realLife: 'ロケ地選定・機材準備・人材確保が必要',
      ai: '撮影不要・PCのみで完結',
      aiWin: true
    },
    {
      feature: 'モデル・演者',
      realLife: 'キャスティング費用・スケジュール調整が必要',
      ai: 'AIモデルで24時間対応',
      aiWin: true
    },
    {
      feature: '天候・環境',
      realLife: '撮影条件に左右される',
      ai: '天候・時間帯を自由に設定',
      aiWin: true
    },
    {
      feature: '修正・変更',
      realLife: '再撮影が必要（追加費用発生）',
      ai: '何度でも編集・調整可能',
      aiWin: true
    },
    {
      feature: 'ABテスト',
      realLife: '複数パターン制作に高額費用',
      ai: '無制限にパターン作成可能',
      aiWin: true
    },
    {
      feature: '素材の量',
      realLife: '予算に応じて限定的',
      ai: '月300本以上の新作追加',
      aiWin: true
    },
    {
      feature: '品質の一貫性',
      realLife: '撮影条件により品質にバラつき',
      ai: '常に高品質・一貫性を保証',
      aiWin: true
    },
    {
      feature: '権利関係',
      realLife: '肖像権・著作権処理が複雑',
      ai: '商用利用可能・権利クリア',
      aiWin: true
    }
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
            実写 vs AI動画 <span className="gradient-text">徹底比較</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto">
            従来の実写撮影とAI動画素材の違いを詳しく比較しました
          </p>
        </div>

        {/* 比較表 */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left py-4 px-6 bg-gray-800/50 rounded-tl-xl">
                    <span className="text-gray-400 font-semibold text-sm uppercase tracking-wider">比較項目</span>
                  </th>
                  <th className="text-center py-4 px-6 bg-gray-800/50">
                    <span className="text-gray-400 font-semibold text-sm uppercase tracking-wider">実写撮影</span>
                  </th>
                  <th className="text-center py-4 px-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-tr-xl">
                    <span className="gradient-text font-semibold text-sm uppercase tracking-wider">AI Creative Stock</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((item, index) => (
                  <tr key={index} className="border-t border-gray-800">
                    <td className="py-5 px-6">
                      <span className="text-white font-medium">{item.feature}</span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      <div className="flex items-center justify-center">
                        <div className="text-gray-400 text-sm max-w-xs mx-auto">
                          {item.realLife}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-center bg-gradient-to-r from-purple-600/5 to-blue-600/5">
                      <div className="flex items-center justify-center">
                        <div className="text-white font-medium text-sm max-w-xs mx-auto">
                          {item.ai}
                          {item.aiWin && (
                            <Check className="inline-block w-5 h-5 text-green-400 ml-2" />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* サマリーボックス */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-effect rounded-xl p-6 border border-red-500/20">
            <div className="text-3xl font-bold text-red-400 mb-2">95%</div>
            <div className="text-gray-400 text-sm">コスト削減</div>
          </div>
          <div className="glass-effect rounded-xl p-6 border border-green-500/20">
            <div className="text-3xl font-bold text-green-400 mb-2">10倍</div>
            <div className="text-gray-400 text-sm">制作スピード</div>
          </div>
          <div className="glass-effect rounded-xl p-6 border border-blue-500/20">
            <div className="text-3xl font-bold text-blue-400 mb-2">無制限</div>
            <div className="text-gray-400 text-sm">ABテスト可能</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button className="btn-primary text-lg px-8 py-4">
            AI動画素材を今すぐ体験
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
