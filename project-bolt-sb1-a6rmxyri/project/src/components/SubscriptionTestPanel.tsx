// サブスクリプション契約テストパネル
import React, { useState } from 'react';
import { Play, Check, X, AlertCircle, CreditCard, User, Settings, RefreshCw } from 'lucide-react';
import { SubscriptionTest } from '../lib/subscriptionTest';
import { subscriptionPlans } from '../lib/stripe';
import { useUser } from '../hooks/useUser';

const SubscriptionTestPanel: React.FC = () => {
  const { user } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('standard');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [testSubscriptions, setTestSubscriptions] = useState<any[]>([]);

  const testCards = SubscriptionTest.getTestCards();

  // E2Eテストの実行
  const runE2ETest = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      const result = await SubscriptionTest.runE2ETest(user.id);
      setTestResults(result.results || []);
      
      if (result.success) {
        alert('E2Eテストが正常に完了しました');
      } else {
        alert(`E2Eテストが失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('E2Eテスト実行エラー:', error);
      alert('E2Eテストの実行に失敗しました');
    } finally {
      setIsRunning(false);
    }
  };

  // テストサブスクリプション作成
  const createTestSubscription = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    try {
      const result = await SubscriptionTest.createTestSubscription(user.id, selectedPlan);
      
      if (result.success) {
        alert('テストサブスクリプションが作成されました');
        checkSubscriptionStatus();
      } else {
        alert(`テストサブスクリプションの作成に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('テストサブスクリプション作成エラー:', error);
      alert('テストサブスクリプションの作成に失敗しました');
    }
  };

  // テストサブスクリプション削除
  const deleteTestSubscription = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    try {
      const result = await SubscriptionTest.deleteTestSubscription(user.id);
      
      if (result.success) {
        alert('テストサブスクリプションが削除されました');
        checkSubscriptionStatus();
      } else {
        alert(`テストサブスクリプションの削除に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('テストサブスクリプション削除エラー:', error);
      alert('テストサブスクリプションの削除に失敗しました');
    }
  };

  // サブスクリプション状態確認
  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const result = await SubscriptionTest.checkSubscriptionStatus(user.id);
      setSubscriptionStatus(result);
    } catch (error) {
      console.error('サブスクリプション状態確認エラー:', error);
    }
  };

  // テストサブスクリプション一覧取得
  const loadTestSubscriptions = async () => {
    try {
      const result = await SubscriptionTest.getTestSubscriptions();
      
      if (result.success) {
        setTestSubscriptions(result.subscriptions || []);
      } else {
        alert(`テストサブスクリプション一覧の取得に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('テストサブスクリプション一覧取得エラー:', error);
      alert('テストサブスクリプション一覧の取得に失敗しました');
    }
  };

  // テスト環境初期化
  const initializeTestEnvironment = async () => {
    try {
      const result = await SubscriptionTest.initializeTestEnvironment();
      
      if (result.success) {
        alert(result.message);
        loadTestSubscriptions();
      } else {
        alert(`テスト環境の初期化に失敗しました: ${result.error}`);
      }
    } catch (error) {
      console.error('テスト環境初期化エラー:', error);
      alert('テスト環境の初期化に失敗しました');
    }
  };

  // 初期化時にデータを読み込み
  React.useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
      loadTestSubscriptions();
    }
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <X className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🧪 サブスクリプション契約テスト</h1>
        <p className="text-gray-600">サブスクリプション機能の動作確認とテストを行います。</p>
      </div>

      {/* ユーザー情報 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          ユーザー情報
        </h2>
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>ユーザーID:</strong> {user.id}
            </div>
            <div>
              <strong>メールアドレス:</strong> {user.email}
            </div>
          </div>
        ) : (
          <p className="text-red-600">ログインが必要です</p>
        )}
      </div>

      {/* サブスクリプション状態 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          現在のサブスクリプション状態
        </h2>
        <div className="flex items-center justify-between">
          <div>
            {subscriptionStatus ? (
              <div className={`p-3 rounded-lg ${subscriptionStatus.isSubscribed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {subscriptionStatus.isSubscribed ? '✅ アクティブ' : '❌ 非アクティブ'}
                {subscriptionStatus.subscription && (
                  <div className="mt-2 text-sm">
                    <div>プラン: {subscriptionStatus.subscription.plan_id}</div>
                    <div>期間: {new Date(subscriptionStatus.subscription.current_period_end).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">読み込み中...</div>
            )}
          </div>
          <button
            onClick={checkSubscriptionStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      {/* テストコントロール */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Play className="w-5 h-5 mr-2" />
          テストコントロール
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* E2Eテスト */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">E2Eテスト</h3>
            <p className="text-sm text-gray-600 mb-3">サブスクリプション機能の全体的なテスト</p>
            <button
              onClick={runE2ETest}
              disabled={isRunning || !user}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning || !user
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isRunning ? '実行中...' : 'E2Eテスト実行'}
            </button>
          </div>

          {/* テストサブスクリプション作成 */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">テストサブスクリプション作成</h3>
            <div className="mb-3">
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {subscriptionPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.monthlyDownloads}本/月
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={createTestSubscription}
              disabled={!user}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                !user
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              テストサブスクリプション作成
            </button>
          </div>

          {/* テストサブスクリプション削除 */}
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">テストサブスクリプション削除</h3>
            <p className="text-sm text-gray-600 mb-3">現在のテストサブスクリプションを削除</p>
            <button
              onClick={deleteTestSubscription}
              disabled={!user}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                !user
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              テストサブスクリプション削除
            </button>
          </div>
        </div>

        {/* テスト環境初期化 */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">⚠️ テスト環境初期化</h3>
          <p className="text-sm text-yellow-700 mb-3">すべてのテストデータを削除し、テスト環境を初期化します。</p>
          <button
            onClick={initializeTestEnvironment}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            テスト環境初期化
          </button>
        </div>
      </div>

      {/* テスト結果 */}
      {testResults.length > 0 && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">テスト結果</h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.status === 'passed' ? 'bg-green-50 border-green-200' :
                  result.status === 'failed' ? 'bg-red-50 border-red-200' :
                  result.status === 'running' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(result.status)}
                    <span className="ml-2 font-medium">{result.step}</span>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded ${
                    result.status === 'passed' ? 'bg-green-200 text-green-800' :
                    result.status === 'failed' ? 'bg-red-200 text-red-800' :
                    result.status === 'running' ? 'bg-blue-200 text-blue-800' :
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {result.status}
                  </span>
                </div>
                {result.message && (
                  <p className="mt-2 text-sm text-gray-600">{result.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripeテストカード情報 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Stripeテストカード情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(testCards).map(([key, card]) => (
            <div key={key} className="p-3 border rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">{card.description}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>カード番号:</strong> {card.number}</div>
                <div><strong>有効期限:</strong> {card.expiry}</div>
                <div><strong>CVC:</strong> {card.cvc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* テストサブスクリプション一覧 */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">テストサブスクリプション一覧</h2>
          <button
            onClick={loadTestSubscriptions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            更新
          </button>
        </div>
        
        {testSubscriptions.length === 0 ? (
          <p className="text-gray-500">テストサブスクリプションがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">ユーザーID</th>
                  <th className="border border-gray-300 p-2 text-left">プラン</th>
                  <th className="border border-gray-300 p-2 text-left">状態</th>
                  <th className="border border-gray-300 p-2 text-left">期間</th>
                  <th className="border border-gray-300 p-2 text-left">作成日</th>
                </tr>
              </thead>
              <tbody>
                {testSubscriptions.map((sub, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-sm">
                      {sub.user_id.substring(0, 8)}...
                    </td>
                    <td className="border border-gray-300 p-2">{sub.plan_id}</td>
                    <td className="border border-gray-300 p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      {new Date(sub.current_period_end).toLocaleDateString()}
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionTestPanel;