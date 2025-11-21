import React, { useState, useEffect } from 'react';
import { Download, Calendar, CreditCard, FileText, ExternalLink, ChevronDown, ChevronUp, Receipt, DollarSign } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { database } from '../lib/supabase';

interface PaymentRecord {
  id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: string;
  plan: 'standard' | 'pro' | 'business' | 'enterprise';
  billing_period: 'monthly' | 'yearly';
  created_at: string;
}

const PaymentHistory: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await database
        .from('payment_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Payment history fetch error:', error);
        return;
      }

      setPayments(data || []);
    } catch (error) {
      console.error('Payment history error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string = 'jpy') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100); // Stripeは金額をセント単位で保存
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'standard': return 'スタンダード';
      case 'pro': return 'プロ';
      case 'business':
      case 'enterprise':
        return 'ビジネス';
      default: return plan;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'failed': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return '完了';
      case 'pending': return '処理中';
      case 'failed': return '失敗';
      default: return status;
    }
  };

  const toggleRowExpansion = (paymentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(paymentId)) {
      newExpanded.delete(paymentId);
    } else {
      newExpanded.add(paymentId);
    }
    setExpandedRows(newExpanded);
  };

  const downloadInvoice = async (payment: PaymentRecord) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          paymentIntentId: payment.stripe_payment_intent_id,
          action: 'download'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '請求書の取得に失敗しました');
      }

      const { download_url, invoice_number } = await response.json();
      
      if (download_url) {
        // 新しいタブでPDFを開く
        const link = document.createElement('a');
        link.href = download_url;
        link.target = '_blank';
        link.download = `請求書_${invoice_number || payment.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('ダウンロードURLが取得できませんでした');
      }
    } catch (error) {
      console.error('Invoice download error:', error);
      alert(`請求書のダウンロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.billing_period === filter;
  });

  const totalAmount = filteredPayments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">決済履歴を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-4">
            <span className="gradient-text">決済履歴</span>
          </h1>
          <p className="text-sm sm:text-lg text-gray-400">
            サブスクリプションの決済履歴とインボイスの管理
          </p>
        </div>

        {/* サマリー統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="glass-effect rounded-xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">総支払額</h3>
                <p className="text-gray-400 text-sm">成功した決済の合計</p>
              </div>
            </div>
            <p className="text-2xl font-black text-green-400">
              {formatPrice(totalAmount)}
            </p>
          </div>

          <div className="glass-effect rounded-xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">決済回数</h3>
                <p className="text-gray-400 text-sm">総取引数</p>
              </div>
            </div>
            <p className="text-2xl font-black text-cyan-400">
              {filteredPayments.length}回
            </p>
          </div>

          <div className="glass-effect rounded-xl p-4 sm:p-6 border border-white/10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">最終決済</h3>
                <p className="text-gray-400 text-sm">最新の取引日</p>
              </div>
            </div>
            <p className="text-sm font-bold text-purple-400">
              {payments.length > 0 ? 
                formatDate(payments[0].created_at).split(' ')[0] : 
                '取引なし'
              }
            </p>
          </div>
        </div>

        {/* フィルター */}
        <div className="mb-6 sm:mb-8">
          <div className="glass-effect rounded-2xl p-2 border border-white/10 inline-flex">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter('monthly')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all ${
                filter === 'monthly'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              月額プラン
            </button>
            <button
              onClick={() => setFilter('yearly')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all ${
                filter === 'yearly'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              年額プラン
            </button>
          </div>
        </div>

        {/* 決済履歴テーブル */}
        <div className="glass-effect rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden">
          {filteredPayments.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">決済履歴がありません</h3>
              <p className="text-gray-400">
                まだ決済が行われていません。プランを購入すると履歴が表示されます。
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-4 sm:p-6 font-bold text-white">決済日時</th>
                    <th className="text-left p-4 sm:p-6 font-bold text-white">プラン</th>
                    <th className="text-left p-4 sm:p-6 font-bold text-white">金額</th>
                    <th className="text-left p-4 sm:p-6 font-bold text-white">ステータス</th>
                    <th className="text-left p-4 sm:p-6 font-bold text-white">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <React.Fragment key={payment.id}>
                      <tr className="border-t border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-4 sm:p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-600 rounded-lg flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {formatDate(payment.created_at).split(' ')[0]}
                              </p>
                              <p className="text-gray-400 text-sm">
                                {formatDate(payment.created_at).split(' ')[1]}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 sm:p-6">
                          <div>
                            <p className="text-white font-medium">
                              {getPlanName(payment.plan)}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {payment.billing_period === 'yearly' ? '年額プラン' : '月額プラン'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 sm:p-6">
                          <p className="text-white font-bold text-lg">
                            {formatPrice(payment.amount, payment.currency)}
                          </p>
                        </td>
                        <td className="p-4 sm:p-6">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                            {getStatusText(payment.status)}
                          </span>
                        </td>
                        <td className="p-4 sm:p-6">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => toggleRowExpansion(payment.id)}
                              className="text-gray-400 hover:text-white transition-colors"
                              title="詳細を表示"
                            >
                              {expandedRows.has(payment.id) ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                            {payment.status === 'succeeded' && (
                              <button
                                onClick={() => downloadInvoice(payment)}
                                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                title="請求書をダウンロード"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(payment.id) && (
                        <tr className="border-t border-white/10 bg-white/2">
                          <td colSpan={5} className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <h4 className="text-white font-bold mb-3">決済詳細</h4>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">決済日時</span>
                                  <span className="text-white">
                                    {formatDate(payment.created_at)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">通貨</span>
                                  <span className="text-white">{payment.currency.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">決済方法</span>
                                  <div className="flex items-center space-x-2">
                                    <CreditCard className="w-4 h-4 text-gray-400" />
                                    <span className="text-white">クレジットカード</span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">サービス期間</span>
                                  <span className="text-white">
                                    {payment.billing_period === 'yearly' ? '12ヶ月間' : '1ヶ月間'}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h4 className="text-white font-bold mb-3">アクション</h4>
                                {payment.status === 'succeeded' && (
                                  <div className="space-y-2">
                                    <button
                                      onClick={() => downloadInvoice(payment)}
                                      className="w-full cyber-button text-white py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>請求書をダウンロード</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        const details = `プラン: ${getPlanName(payment.plan)}\n金額: ${formatPrice(payment.amount, payment.currency)}\n決済日: ${formatDate(payment.created_at)}\n請求サイクル: ${payment.billing_period === 'yearly' ? '年額' : '月額'}`;
                                        navigator.clipboard.writeText(details);
                                        alert('決済情報をクリップボードにコピーしました');
                                      }}
                                      className="w-full glass-effect border border-white/20 text-gray-300 hover:text-white py-2 px-4 rounded-lg transition-all font-medium flex items-center justify-center space-x-2"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      <span>情報をコピー</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
