import { ArrowLeft } from 'lucide-react';

interface CommercialTransactionProps {
  onPageChange: (page: string) => void;
}

export default function CommercialTransaction({ onPageChange }: CommercialTransactionProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button
          onClick={() => onPageChange('landing')}
          className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-8 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          ホームに戻る
        </button>

        <h1 className="text-4xl font-bold mb-8">特定商取引法に基づく表記</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-6">最終更新日: 2025年1月1日</p>

          <section className="mb-8">
            <div className="bg-gray-900 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">販売事業者</h2>
                <p className="text-gray-300">AI CreativeStock 運営事務局</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">運営統括責任者</h2>
                <p className="text-gray-300">AI CreativeStock 運営事務局 代表</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">所在地</h2>
                <p className="text-gray-300">請求があったら遅滞なく開示いたします。</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">お問い合わせ</h2>
                <p className="text-gray-300">本サービス内のお問い合わせフォームよりご連絡ください。</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">販売価格</h2>
                <p className="text-gray-300">各プランページに表示された料金（税込）</p>
                <ul className="list-disc list-inside text-gray-300 mt-2 ml-4 space-y-1">
                  <li>スタンダードプラン: 月額9,800円（税込）</li>
                  <li>プレミアムプラン: 月額19,800円（税込）</li>
                  <li>ビジネスプラン: 月額49,800円（税込）</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">料金のお支払時期</h2>
                <p className="text-gray-300">クレジットカード決済の場合、各カード会社の引き落とし日に準じます。</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">サービス提供時期</h2>
                <p className="text-gray-300">お申し込み完了後、即時ご利用いただけます。</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">お支払方法</h2>
                <p className="text-gray-300">クレジットカード決済</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">返品・交換・キャンセル等</h2>
                <p className="text-gray-300">
                  デジタルコンテンツという商品の性質上、原則として返金はお受けできません。詳しくは返金ポリシーをご確認ください。
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">動作環境</h2>
                <p className="text-gray-300">
                  インターネット接続環境、最新のウェブブラウザ（Chrome、Safari、Firefox、Edge等）
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2 text-pink-400">その他特記事項</h2>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>サブスクリプションは自動更新されます</li>
                  <li>解約は次回更新日の前日までに行ってください</li>
                  <li>動画素材の商用利用が可能です</li>
                  <li>動画素材の再販売・再配布は禁止されています</li>
                </ul>
              </div>
            </div>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">AI CreativeStock 運営事務局</p>
          </div>
        </div>
      </div>
    </div>
  );
}
