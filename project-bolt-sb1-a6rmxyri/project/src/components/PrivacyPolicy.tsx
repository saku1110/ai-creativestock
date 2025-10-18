import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onPageChange: (page: string) => void;
}

export default function PrivacyPolicy({ onPageChange }: PrivacyPolicyProps) {
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
        
        <h1 className="text-4xl font-bold mb-8">プライバシーポリシー</h1>
        
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 mb-6">最終更新日: 2025年7月18日</p>
          
          <section className="mb-8">
            <p className="text-gray-300 mb-4">
              AI Creative Stock（以下「当社」といいます。）は、本ウェブサイト上で提供するサービス（以下「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第1条（個人情報）</h2>
            <p className="text-gray-300">
              「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第2条（個人情報の収集方法）</h2>
            <p className="text-gray-300 mb-4">
              当社は、ユーザーが利用登録をする際に氏名、メールアドレスなどの個人情報をお尋ねすることがあります。また、ユーザーと提携先などとの間でなされたユーザーの個人情報を含む取引記録や決済に関する情報を、当社の提携先（情報提供元、広告主、広告配信先などを含みます。以下「提携先」といいます。）などから収集することがあります。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第3条（個人情報を収集・利用する目的）</h2>
            <p className="text-gray-300 mb-4">当社が個人情報を収集・利用する目的は、以下のとおりです。</p>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社サービスの提供・運営のため</li>
              <li>ユーザーからのお問い合わせに回答するため（本人確認を行うことを含む）</li>
              <li>ユーザーが利用中のサービスの新機能、更新情報、キャンペーン等及び当社が提供する他のサービスの案内のメールを送付するため</li>
              <li>メンテナンス、重要なお知らせなど必要に応じたご連絡のため</li>
              <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をし、ご利用をお断りするため</li>
              <li>ユーザーにご自身の登録情報の閲覧や変更、削除、ご利用状況の閲覧を行っていただくため</li>
              <li>有料サービスにおいて、ユーザーに利用料金を請求するため</li>
              <li>上記の利用目的に付随する目的</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第4条（利用目的の変更）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、利用目的が変更前と関連性を有すると合理的に認められる場合に限り、個人情報の利用目的を変更するものとします。</li>
              <li>利用目的の変更を行った場合には、変更後の目的について、当社所定の方法により、ユーザーに通知し、または本ウェブサイト上に公表するものとします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第5条（個人情報の第三者提供）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合を除きます。
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                  <li>予め次の事項を告知あるいは公表し、かつ当社が個人情報保護委員会に届出をしたとき
                    <ul className="list-disc list-inside ml-6 mt-2">
                      <li>利用目的に第三者への提供を含むこと</li>
                      <li>第三者に提供されるデータの項目</li>
                      <li>第三者への提供の手段または方法</li>
                      <li>本人の求めに応じて個人情報の第三者への提供を停止すること</li>
                      <li>本人の求めを受け付ける方法</li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第6条（個人情報の開示）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。ただし、開示することにより次のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
                <ul className="list-disc list-inside ml-6 mt-2">
                  <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                  <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                  <li>その他法令に違反することとなる場合</li>
                </ul>
              </li>
              <li>前項の定めにかかわらず、履歴情報および特性情報などの個人情報以外の情報については、原則として開示いたしません。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第7条（個人情報の訂正および削除）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>ユーザーは、当社の保有する自己の個人情報が誤った情報である場合には、当社が定める手続きにより、当社に対して個人情報の訂正、追加または削除（以下「訂正等」といいます。）を請求することができます。</li>
              <li>当社は、ユーザーから前項の請求を受けてその請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の訂正等を行うものとします。</li>
              <li>当社は、前項の規定に基づき訂正等を行った場合、または訂正等を行わない旨の決定をしたときは遅滞なく、これをユーザーに通知します。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第8条（個人情報の利用停止等）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>当社は、本人から、個人情報が、利用目的の範囲を超えて取り扱われているという理由、または不正の手段により取得されたものであるという理由により、その利用の停止または消去（以下「利用停止等」といいます。）を求められた場合には、遅滞なく必要な調査を行います。</li>
              <li>前項の調査結果に基づき、その請求に応じる必要があると判断した場合には、遅滞なく、当該個人情報の利用停止等を行います。</li>
              <li>当社は、前項の規定に基づき利用停止等を行った場合、または利用停止等を行わない旨の決定をしたときは、遅滞なく、これをユーザーに通知します。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第9条（Cookie及び類似技術の使用）</h2>
            <p className="text-gray-300 mb-4">
              当社のサービスでは、Cookie及び類似の技術を使用して情報を収集することがあります。これらの技術は、ユーザー体験の向上、サービスの改善、利用状況の分析等の目的で使用されます。
            </p>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>収集される情報：アクセス日時、閲覧ページ、利用環境等</li>
              <li>利用目的：サービスの利用状況の把握、サービス改善のための分析</li>
              <li>第三者送信：Google Analytics等の分析ツールを通じて、匿名化された情報が送信される場合があります</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第10条（セキュリティ）</h2>
            <p className="text-gray-300">
              当社は、個人情報の漏えい、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。また、個人情報の取扱いに関する社内規程を整備し、従業員に対する監督を行います。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第11条（プライバシーポリシーの変更）</h2>
            <ol className="list-decimal list-inside text-gray-300 space-y-2">
              <li>本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。</li>
              <li>当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">第12条（お問い合わせ窓口）</h2>
            <p className="text-gray-300 mb-4">
              本ポリシーに関するお問い合わせは、本サービス内のお問い合わせフォームよりお願いいたします。
            </p>
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