// サブスクリプション契約テストシステム
import { supabase } from './supabase';
import { stripeService } from './stripe';

/**
 * サブスクリプション契約のテストユーティリティ
 */
export class SubscriptionTest {
  /**
   * テスト用のサブスクリプション作成
   */
  static async createTestSubscription(userId: string, planId: string): Promise<{
    success: boolean;
    subscription?: any;
    error?: string;
  }> {
    try {
      // テスト用のサブスクリプションデータを作成
      const testSubscription = {
        user_id: userId,
        plan_id: planId,
        status: 'active',
        stripe_customer_id: `cus_test_${Date.now()}`,
        stripe_subscription_id: `sub_test_${Date.now()}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Supabaseにテストサブスクリプションを保存
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([testSubscription])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        subscription: data
      };
    } catch (error) {
      console.error('テストサブスクリプション作成エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'テストサブスクリプションの作成に失敗しました'
      };
    }
  }

  /**
   * テスト用のサブスクリプション削除
   */
  static async deleteTestSubscription(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', userId)
        .like('stripe_customer_id', 'cus_test_%');

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('テストサブスクリプション削除エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'テストサブスクリプションの削除に失敗しました'
      };
    }
  }

  /**
   * サブスクリプション状態の確認
   */
  static async checkSubscriptionStatus(userId: string): Promise<{
    isSubscribed: boolean;
    subscription?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        isSubscribed: !!data,
        subscription: data
      };
    } catch (error) {
      console.error('サブスクリプション状態確認エラー:', error);
      return {
        isSubscribed: false,
        error: error instanceof Error ? error.message : 'サブスクリプション状態の確認に失敗しました'
      };
    }
  }

  /**
   * Stripeテストカード情報
   */
  static getTestCards() {
    return {
      success: {
        number: '4242424242424242',
        expiry: '12/34',
        cvc: '123',
        description: '成功するテストカード'
      },
      declined: {
        number: '4000000000000002',
        expiry: '12/34',
        cvc: '123',
        description: '拒否されるテストカード'
      },
      insufficientFunds: {
        number: '4000000000009995',
        expiry: '12/34',
        cvc: '123',
        description: '残高不足のテストカード'
      },
      requiresAuthentication: {
        number: '4000002500003155',
        expiry: '12/34',
        cvc: '123',
        description: '3Dセキュア認証が必要なテストカード'
      }
    };
  }

  /**
   * テスト用のStripe決済フロー
   */
  static async testStripePayment(userId: string, planId: string): Promise<{
    success: boolean;
    sessionId?: string;
    error?: string;
  }> {
    try {
      // テスト環境でのStripe決済セッション作成
      const result = await stripeService.createCheckoutSession(
        planId,
        'monthly',
        userId,
        `${window.location.origin}/payment/success?test=true`,
        `${window.location.origin}/payment/cancel?test=true`
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        success: true,
        sessionId: result.sessionId
      };
    } catch (error) {
      console.error('Stripe決済テストエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe決済テストに失敗しました'
      };
    }
  }

  /**
   * テスト用のサブスクリプション一覧取得
   */
  static async getTestSubscriptions(): Promise<{
    success: boolean;
    subscriptions?: any[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .like('stripe_customer_id', 'cus_test_%')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        subscriptions: data || []
      };
    } catch (error) {
      console.error('テストサブスクリプション一覧取得エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'テストサブスクリプション一覧の取得に失敗しました'
      };
    }
  }

  /**
   * テスト環境の初期化
   */
  static async initializeTestEnvironment(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // テストデータをクリア
      await supabase
        .from('subscriptions')
        .delete()
        .like('stripe_customer_id', 'cus_test_%');

      // テスト用のダミーデータを作成
      const testUsers = [
        {
          id: 'test_user_1',
          email: 'test1@example.com',
          full_name: 'テストユーザー1'
        },
        {
          id: 'test_user_2',
          email: 'test2@example.com',
          full_name: 'テストユーザー2'
        }
      ];

      // テストユーザーのプロフィール作成
      for (const user of testUsers) {
        await supabase
          .from('profiles')
          .upsert(user);
      }

      return {
        success: true,
        message: 'テスト環境が初期化されました'
      };
    } catch (error) {
      console.error('テスト環境初期化エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'テスト環境の初期化に失敗しました'
      };
    }
  }

  /**
   * サブスクリプション契約のE2Eテスト
   */
  static async runE2ETest(userId: string): Promise<{
    success: boolean;
    results?: any[];
    error?: string;
  }> {
    const results = [];
    
    try {
      // 1. 初期状態の確認
      results.push({
        step: '1. 初期状態確認',
        status: 'running'
      });

      const initialStatus = await this.checkSubscriptionStatus(userId);
      results[0].status = initialStatus.isSubscribed ? 'failed' : 'passed';
      results[0].message = initialStatus.isSubscribed ? 'サブスクリプションが既に存在します' : 'サブスクリプションが存在しません（正常）';

      // 2. テストサブスクリプションの作成
      results.push({
        step: '2. テストサブスクリプション作成',
        status: 'running'
      });

      const createResult = await this.createTestSubscription(userId, 'standard');
      results[1].status = createResult.success ? 'passed' : 'failed';
      results[1].message = createResult.success ? 'テストサブスクリプションが作成されました' : createResult.error;

      // 3. サブスクリプション状態の確認
      results.push({
        step: '3. サブスクリプション状態確認',
        status: 'running'
      });

      const statusCheck = await this.checkSubscriptionStatus(userId);
      results[2].status = statusCheck.isSubscribed ? 'passed' : 'failed';
      results[2].message = statusCheck.isSubscribed ? 'サブスクリプションが有効です' : 'サブスクリプションが無効です';

      // 4. テストサブスクリプションの削除
      results.push({
        step: '4. テストサブスクリプション削除',
        status: 'running'
      });

      const deleteResult = await this.deleteTestSubscription(userId);
      results[3].status = deleteResult.success ? 'passed' : 'failed';
      results[3].message = deleteResult.success ? 'テストサブスクリプションが削除されました' : deleteResult.error;

      // 5. 最終状態の確認
      results.push({
        step: '5. 最終状態確認',
        status: 'running'
      });

      const finalStatus = await this.checkSubscriptionStatus(userId);
      results[4].status = finalStatus.isSubscribed ? 'failed' : 'passed';
      results[4].message = finalStatus.isSubscribed ? 'サブスクリプションが残存しています' : 'サブスクリプションが正常に削除されました';

      const allPassed = results.every(result => result.status === 'passed');

      return {
        success: allPassed,
        results
      };
    } catch (error) {
      console.error('E2Eテスト実行エラー:', error);
      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : 'E2Eテストの実行に失敗しました'
      };
    }
  }
}

export default SubscriptionTest;