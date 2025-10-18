// SQLインジェクション対策とデータベースセキュリティ
import { supabase } from './supabase';

/**
 * SQLインジェクション対策
 * Supabaseは自動的にパラメータ化クエリを使用しますが、
 * 追加の検証とサニタイゼーションを提供します
 */

// 危険なSQLキーワードの検出
const DANGEROUS_SQL_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 'UPDATE',
  'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', 'FROM', 'WHERE',
  '--', '/*', '*/', ';', '@@', 'xp_', 'sp_'
];

// SQLインジェクション攻撃パターンの検出
const SQL_INJECTION_PATTERNS = [
  /('|(\\')|(--|;|\||\\|\*|%)|(\w*((\%27)|(\'))((\%6f)|o|(\%4f))((\%72)|r|(\%52)))/i,
  /((\%27)|(\'))((\%75)|u|(\%55))((\%6e)|n|(\%4e))((\%69)|i|(\%49))((\%6f)|o|(\%4f))((\%6e)|n|(\%4e))/i,
  /((\%27)|(\')).*((or)|(\%6f)|(\%4f))((\%72)|r|(\%52))/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION(?:\s+ALL)?\s+SELECT/i,
  /SELECT.*FROM.*WHERE.*=/i,
  /INSERT\s+INTO.*VALUES/i,
  /UPDATE.*SET.*WHERE/i,
  /DELETE\s+FROM.*WHERE/i
];

/**
 * 入力値がSQLインジェクション攻撃を含んでいるかチェック
 */
export const detectSQLInjection = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  
  const normalizedInput = input.toUpperCase().trim();
  
  // 危険なキーワードの検出
  for (const keyword of DANGEROUS_SQL_KEYWORDS) {
    if (normalizedInput.includes(keyword)) {
      return true;
    }
  }
  
  // SQLインジェクションパターンの検出
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
};

/**
 * SQLインジェクション対策付きクエリラッパー
 */
export class SecureSupabaseClient {
  /**
   * 安全な検索クエリ
   */
  static async safeSearch(
    table: string,
    column: string,
    searchTerm: string,
    additionalFilters?: Record<string, any>
  ) {
    // 入力値の検証
    if (detectSQLInjection(searchTerm)) {
      throw new Error('不正な文字が検出されました。検索条件を確認してください。');
    }
    
    if (detectSQLInjection(table) || detectSQLInjection(column)) {
      throw new Error('不正なテーブル名またはカラム名が指定されました。');
    }
    
    // サニタイズされた検索
    const sanitizedSearchTerm = this.sanitizeSearchTerm(searchTerm);
    
    let query = supabase
      .from(table)
      .select('*')
      .ilike(column, `%${sanitizedSearchTerm}%`);
    
    // 追加フィルターの適用
    if (additionalFilters) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (detectSQLInjection(key) || detectSQLInjection(String(value))) {
          throw new Error('追加フィルターに不正な値が含まれています。');
        }
        query = query.eq(key, value);
      });
    }
    
    return await query;
  }
  
  /**
   * 安全なデータ挿入
   */
  static async safeInsert(table: string, data: Record<string, any>) {
    // テーブル名の検証
    if (detectSQLInjection(table)) {
      throw new Error('不正なテーブル名が指定されました。');
    }
    
    // データの検証とサニタイゼーション
    const sanitizedData = this.sanitizeData(data);
    
    return await supabase
      .from(table)
      .insert(sanitizedData)
      .select();
  }
  
  /**
   * 安全なデータ更新
   */
  static async safeUpdate(
    table: string,
    data: Record<string, any>,
    conditions: Record<string, any>
  ) {
    // テーブル名の検証
    if (detectSQLInjection(table)) {
      throw new Error('不正なテーブル名が指定されました。');
    }
    
    // データとコンディションの検証
    const sanitizedData = this.sanitizeData(data);
    const sanitizedConditions = this.sanitizeData(conditions);
    
    let query = supabase
      .from(table)
      .update(sanitizedData);
    
    // 条件の適用
    Object.entries(sanitizedConditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    return await query.select();
  }
  
  /**
   * 安全なデータ削除
   */
  static async safeDelete(table: string, conditions: Record<string, any>) {
    // テーブル名の検証
    if (detectSQLInjection(table)) {
      throw new Error('不正なテーブル名が指定されました。');
    }
    
    // 条件の検証
    const sanitizedConditions = this.sanitizeData(conditions);
    
    // 削除条件が空の場合はエラー（全データ削除防止）
    if (Object.keys(sanitizedConditions).length === 0) {
      throw new Error('削除条件が指定されていません。');
    }
    
    let query = supabase.from(table).delete();
    
    // 条件の適用
    Object.entries(sanitizedConditions).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    
    return await query;
  }
  
  /**
   * データのサニタイゼーション
   */
  private static sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      // キーの検証
      if (detectSQLInjection(key)) {
        throw new Error(`不正なキー名が検出されました: ${key}`);
      }
      
      // 値のサニタイゼーション
      if (typeof value === 'string') {
        if (detectSQLInjection(value)) {
          throw new Error(`不正な値が検出されました: ${key}`);
        }
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else {
        // オブジェクトは再帰的にサニタイズ
        sanitized[key] = this.sanitizeData(value);
      }
    });
    
    return sanitized;
  }
  
  /**
   * 検索語のサニタイゼーション
   */
  private static sanitizeSearchTerm(searchTerm: string): string {
    return searchTerm
      .replace(/[%_]/g, '\\$&') // LIKE演算子の特殊文字をエスケープ
      .replace(/['"]/g, ''); // クォートを除去
  }
  
  /**
   * 文字列のサニタイゼーション
   */
  private static sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, '') // HTMLタグの除去
      .replace(/['"]/g, '') // クォートの除去
      .trim(); // 前後の空白を除去
  }
}

/**
 * RLS（Row Level Security）ポリシーのテンプレート
 * Supabaseで使用する安全なRLSポリシーの例
 */
export const RLS_POLICY_TEMPLATES = {
  // ユーザーは自分のデータのみアクセス可能
  USER_OWNS_DATA: `
    CREATE POLICY "Users can only access their own data" 
    ON {table_name}
    FOR ALL 
    USING (auth.uid() = user_id);
  `,
  
  // 管理者は全データアクセス可能
  ADMIN_FULL_ACCESS: `
    CREATE POLICY "Admins have full access" 
    ON {table_name}
    FOR ALL 
    USING (
      EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    );
  `,
  
  // 公開データは誰でも読み取り可能
  PUBLIC_READ_ONLY: `
    CREATE POLICY "Public read access" 
    ON {table_name}
    FOR SELECT 
    USING (is_public = true);
  `,
  
  // 認証ユーザーのみアクセス可能
  AUTHENTICATED_ONLY: `
    CREATE POLICY "Authenticated users only" 
    ON {table_name}
    FOR ALL 
    USING (auth.role() = 'authenticated');
  `
};

/**
 * データベース監査ログ
 */
export const logDatabaseOperation = async (
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  userId?: string,
  details?: any
) => {
  try {
    await supabase
      .from('database_audit_logs')
      .insert({
        operation,
        table_name: table,
        user_id: userId,
        details: details || {},
        timestamp: new Date().toISOString(),
        ip_address: await getClientIP()
      });
  } catch (error) {
    console.error('監査ログの記録に失敗:', error);
  }
};

/**
 * クライアントIPアドレスの取得
 */
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
};

/**
 * データベース操作の監査機能付きラッパー
 */
export const withDatabaseAudit = async <T>(
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  dbOperation: () => Promise<T>,
  userId?: string,
  details?: any
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await dbOperation();
    
    // 成功時の監査ログ
    await logDatabaseOperation(operation, table, userId, {
      ...details,
      success: true,
      duration_ms: Date.now() - startTime
    });
    
    return result;
  } catch (error) {
    // エラー時の監査ログ
    await logDatabaseOperation(operation, table, userId, {
      ...details,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime
    });
    
    throw error;
  }
};