import { supabase } from '../lib/supabase';

interface AdminSetupConfig {
  email: string;
  role?: string;
  permissions?: string[];
}

/**
 * 初期管理者アカウントをセットアップするスクリプト
 * 
 * 使用方法:
 * 1. 開発環境でこのスクリプトを一度だけ実行
 * 2. 指定されたメールアドレスのユーザーが管理者として登録される
 * 3. そのユーザーがログイン後、管理者機能にアクセス可能になる
 */
export class AdminSetup {
  private config: AdminSetupConfig;

  constructor(config: AdminSetupConfig) {
    this.config = {
      role: 'admin',
      permissions: ['upload', 'delete', 'manage_users'],
      ...config
    };
  }

  /**
   * メールアドレスからユーザーIDを取得
   */
  private async getUserIdByEmail(email: string): Promise<string | null> {
    try {
      // プロフィールテーブルからユーザーを検索
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (error) {
        console.error('ユーザー検索エラー:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('ユーザー検索中に予期しないエラー:', error);
      return null;
    }
  }

  /**
   * 既に管理者として登録されているかチェック
   */
  private async isAlreadyAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('管理者チェックエラー:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('管理者チェック中に予期しないエラー:', error);
      return false;
    }
  }

  /**
   * 管理者ユーザーを追加
   */
  private async addAdminUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_users')
        .insert([{
          user_id: userId,
          role: this.config.role,
          permissions: this.config.permissions
        }]);

      if (error) {
        console.error('管理者追加エラー:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('管理者追加中に予期しないエラー:', error);
      return false;
    }
  }

  /**
   * データベーステーブルの存在確認
   */
  private async verifyTables(): Promise<boolean> {
    try {
      // profilesテーブルの確認
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profilesError) {
        console.error('profilesテーブルが存在しないか、アクセスできません:', profilesError);
        return false;
      }

      // admin_usersテーブルの確認
      const { error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1);

      if (adminError) {
        console.error('admin_usersテーブルが存在しないか、アクセスできません:', adminError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('テーブル確認中にエラー:', error);
      return false;
    }
  }

  /**
   * 初期管理者セットアップを実行
   */
  public async setup(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    console.log('🚀 初期管理者セットアップを開始します...');
    console.log(`📧 対象メールアドレス: ${this.config.email}`);

    // Step 1: データベーステーブルの確認
    console.log('📋 データベーステーブルを確認中...');
    const tablesExist = await this.verifyTables();
    if (!tablesExist) {
      return {
        success: false,
        message: 'データベーステーブルが正しく設定されていません。schema.sqlを実行してください。'
      };
    }
    console.log('✅ データベーステーブルが確認されました');

    // Step 2: ユーザーIDを取得
    console.log('👤 ユーザーを検索中...');
    const userId = await this.getUserIdByEmail(this.config.email);
    if (!userId) {
      return {
        success: false,
        message: `指定されたメールアドレス (${this.config.email}) のユーザーが見つかりません。まず該当ユーザーでログインしてプロフィールを作成してください。`
      };
    }
    console.log(`✅ ユーザーが見つかりました (ID: ${userId})`);

    // Step 3: 既存の管理者権限をチェック
    console.log('🔍 既存の管理者権限をチェック中...');
    const isAdmin = await this.isAlreadyAdmin(userId);
    if (isAdmin) {
      return {
        success: true,
        message: `指定されたユーザーは既に管理者として登録されています。`,
        details: { userId, email: this.config.email }
      };
    }

    // Step 4: 管理者権限を追加
    console.log('👑 管理者権限を追加中...');
    const addResult = await this.addAdminUser(userId);
    if (!addResult) {
      return {
        success: false,
        message: '管理者権限の追加に失敗しました。データベースの権限設定を確認してください。'
      };
    }

    console.log('🎉 初期管理者セットアップが完了しました！');
    return {
      success: true,
      message: `${this.config.email} を管理者として登録しました。`,
      details: {
        userId,
        email: this.config.email,
        role: this.config.role,
        permissions: this.config.permissions
      }
    };
  }

  /**
   * 管理者権限を削除（テスト用）
   */
  public async removeAdmin(): Promise<boolean> {
    console.log('🗑️ 管理者権限を削除中...');
    
    const userId = await this.getUserIdByEmail(this.config.email);
    if (!userId) {
      console.error('ユーザーが見つかりません');
      return false;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('管理者削除エラー:', error);
        return false;
      }

      console.log('✅ 管理者権限を削除しました');
      return true;
    } catch (error) {
      console.error('管理者削除中に予期しないエラー:', error);
      return false;
    }
  }

  /**
   * 全管理者のリストを表示
   */
  public async listAdmins(): Promise<void> {
    console.log('📋 管理者一覧を取得中...');

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          role,
          permissions,
          created_at,
          profiles!inner(email, full_name)
        `);

      if (error) {
        console.error('管理者一覧取得エラー:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('❌ 管理者が登録されていません');
        return;
      }

      console.log('👑 管理者一覧:');
      data.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.profiles.email} (${admin.profiles.full_name || 'N/A'})`);
        console.log(`     役割: ${admin.role}`);
        console.log(`     権限: ${admin.permissions?.join(', ') || 'なし'}`);
        console.log(`     追加日: ${new Date(admin.created_at).toLocaleDateString()}`);
        console.log('');
      });
    } catch (error) {
      console.error('管理者一覧取得中に予期しないエラー:', error);
    }
  }
}

// スクリプト実行用の関数
export const setupInitialAdmin = async (email: string) => {
  const adminSetup = new AdminSetup({ email });
  return await adminSetup.setup();
};

// コマンドライン実行時の処理（Node.js環境）
if (typeof process !== 'undefined' && process.argv) {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ メールアドレスを指定してください');
    console.log('使用方法: npm run setup-admin user@example.com');
    process.exit(1);
  }

  setupInitialAdmin(email)
    .then((result) => {
      if (result.success) {
        console.log('✅', result.message);
        if (result.details) {
          console.log('詳細:', result.details);
        }
      } else {
        console.error('❌', result.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ セットアップ中にエラーが発生しました:', error);
      process.exit(1);
    });
}