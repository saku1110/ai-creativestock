import { ArrowLeft } from 'lucide-react';

interface RefundPolicyProps {
  onPageChange: (page: string) => void;
}

export default function RefundPolicy({ onPageChange }: RefundPolicyProps) {
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

        <h1 className="text-4xl font-bold mb-8">返金ポリシー</h1>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-6">最終更新日: 2025年1月1日</p>

          <section className="mb-8">
            <p className="text-gray-300 mb-4">
              AI CreativeStock 運営事務局が提供するサービスにおける返金ポリシーについて定めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">基本方針</h2>
            <p className="text-gray-300">
              本サービスはデジタルコンテンツを提供するサブスクリプションサービスです。原則として返金は承っておりません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">返金不可の場合</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>ユーザー都合によるキャンセル</li>
              <li>無料トライアル終了後の自動課金</li>
              <li>更新日を過ぎた後の解約</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">例外的な返金対応</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>システム不具合によりサービスを利用できなかった場合</li>
              <li>重複決済が発生した場合</li>
              <li>当運営事務局の責めに帰すべき事由がある場合</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">お問い合わせ</h2>
            <p className="text-gray-300">
              返金に関するご相談は、お問い合わせフォームよりご連絡ください。
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">AI CreativeStock 運営事務局</p>
          </div>
        </div>
      </div>
    </div>
  );
}
