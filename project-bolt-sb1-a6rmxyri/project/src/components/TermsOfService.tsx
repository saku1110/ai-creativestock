import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onPageChange: (page: string) => void;
}

export default function TermsOfService({ onPageChange }: TermsOfServiceProps) {
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
        
        <h1 className="text-4xl font-bold mb-8">利用規約</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-6">最終更新日: 2025年7月18日</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第1条（適用）</h2>
            <p className="text-gray-300 mb-4">
              本規約は、AI Creative Stock（以下「当社」といいます。）が提供するAI生成動画素材のサブスクリプションサービス（以下「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆様（以下「ユーザー」といいます。）には、本規約に従って本サービスをご利用いただきます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第2条（利用登録）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>利用登録を希望する方は、本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
              <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあります。
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                  <li>本規約に違反したことがある者からの申請である場合</li>
                  <li>その他、当社が利用登録を相当でないと判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</li>
              <li>ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与することはできません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第4条（利用料金および支払方法）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>ユーザーは、本サービスの利用に対し、当社が別途定める利用料金を、当社が指定する方法により支払うものとします。</li>
              <li>ユーザーが利用料金の支払を遅滞した場合、ユーザーは年14.6％の割合による遅延損害金を支払うものとします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第5条（素材の利用許諾）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、ユーザーに対し、本サービスにおいて提供する動画素材（以下「本素材」といいます。）を以下の範囲で利用することを許諾します。
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>商用・非商用を問わず、動画制作、広告制作、その他のコンテンツ制作に利用すること</li>
                  <li>本素材を編集・加工して利用すること</li>
                  <li>本素材を含む成果物を複製、配布、公衆送信すること</li>
                </ul>
              </li>
              <li>ユーザーは、本素材そのものを単体で販売、再配布することはできません。</li>
              <li>ユーザーは、本素材の著作権その他の権利が当社に帰属することを確認します。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第6条（禁止事項）</h2>
            <p className="text-gray-300 mb-4">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社、本サービスの他のユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
              <li>当社のサービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>本素材を単体で販売、再配布、またはストックフォトサービスに登録する行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第7条（本サービスの提供の停止等）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                  <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                  <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                  <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第8条（免責事項）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社の債務不履行責任は、当社の故意または重過失によらない場合には免責されるものとします。</li>
              <li>当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第9条（サービス内容の変更等）</h2>
            <p className="text-gray-300">
              当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第10条（利用規約の変更）</h2>
            <p className="text-gray-300">
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第11条（個人情報の取扱い）</h2>
            <p className="text-gray-300">
              当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第12条（準拠法・裁判管轄）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
              <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
            </ol>
          </section>

          <div className="mt-12 pt-8 border-t border-gray-800">
            <p className="text-gray-400 text-sm">
              以上
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}