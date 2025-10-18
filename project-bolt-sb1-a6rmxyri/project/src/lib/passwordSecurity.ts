// パスワードセキュリティ - bcryptを使用したソルト付きハッシュ化
import bcrypt from 'bcryptjs';

/**
 * パスワードセキュリティの設定
 */
const PASSWORD_CONFIG = {
  // bcryptのソルトラウンド数（推奨: 12-15）
  SALT_ROUNDS: 12,
  
  // パスワードの最小要件
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  
  // パスワード強度要件
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: true,
  
  // パスワード履歴の保持数
  PASSWORD_HISTORY_COUNT: 5,
  
  // パスワードリセットトークンの有効期限（ミリ秒）
  RESET_TOKEN_EXPIRY: 60 * 60 * 1000 // 1時間
};

/**
 * パスワード強度の検証
 */
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-100
  feedback: string[];
  requirements: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    commonPassword: boolean;
  };
}

/**
 * よく使われる弱いパスワードのリスト（一部）
 */
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', '1234567890', 'football', 'iloveyou', 'master',
  'sunshine', 'princess', 'charlie', 'login', 'freedom'
];

/**
 * パスワード強度の検証
 */
export const validatePasswordStrength = (password: string): PasswordStrengthResult => {
  const result: PasswordStrengthResult = {
    isValid: false,
    score: 0,
    feedback: [],
    requirements: {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
      commonPassword: false
    }
  };
  
  if (!password || typeof password !== 'string') {
    result.feedback.push('パスワードが入力されていません');
    return result;
  }
  
  // 長さチェック
  if (password.length >= PASSWORD_CONFIG.MIN_LENGTH) {
    result.requirements.length = true;
    result.score += 20;
  } else {
    result.feedback.push(`パスワードは${PASSWORD_CONFIG.MIN_LENGTH}文字以上である必要があります`);
  }
  
  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    result.feedback.push(`パスワードは${PASSWORD_CONFIG.MAX_LENGTH}文字以下である必要があります`);
    return result;
  }
  
  // 大文字チェック
  if (/[A-Z]/.test(password)) {
    result.requirements.uppercase = true;
    result.score += 15;
  } else if (PASSWORD_CONFIG.REQUIRE_UPPERCASE) {
    result.feedback.push('大文字を含む必要があります');
  }
  
  // 小文字チェック
  if (/[a-z]/.test(password)) {
    result.requirements.lowercase = true;
    result.score += 15;
  } else if (PASSWORD_CONFIG.REQUIRE_LOWERCASE) {
    result.feedback.push('小文字を含む必要があります');
  }
  
  // 数字チェック
  if (/[0-9]/.test(password)) {
    result.requirements.numbers = true;
    result.score += 15;
  } else if (PASSWORD_CONFIG.REQUIRE_NUMBERS) {
    result.feedback.push('数字を含む必要があります');
  }
  
  // 記号チェック
  if (/[^A-Za-z0-9]/.test(password)) {
    result.requirements.symbols = true;
    result.score += 15;
  } else if (PASSWORD_CONFIG.REQUIRE_SYMBOLS) {
    result.feedback.push('記号を含む必要があります');
  }
  
  // よく使われるパスワードのチェック
  if (!COMMON_PASSWORDS.includes(password.toLowerCase())) {
    result.requirements.commonPassword = true;
    result.score += 10;
  } else {
    result.feedback.push('よく使われるパスワードです。より独自性のあるパスワードを使用してください');
  }
  
  // 連続文字のチェック
  if (!/(.)\1{2,}/.test(password)) {
    result.score += 10;
  } else {
    result.feedback.push('同じ文字の連続は避けてください');
  }
  
  // パスワードが有効かどうかの判定
  result.isValid = result.requirements.length &&
    (!PASSWORD_CONFIG.REQUIRE_UPPERCASE || result.requirements.uppercase) &&
    (!PASSWORD_CONFIG.REQUIRE_LOWERCASE || result.requirements.lowercase) &&
    (!PASSWORD_CONFIG.REQUIRE_NUMBERS || result.requirements.numbers) &&
    (!PASSWORD_CONFIG.REQUIRE_SYMBOLS || result.requirements.symbols) &&
    result.requirements.commonPassword;
  
  // スコアによる追加フィードバック
  if (result.score >= 80) {
    result.feedback.push('非常に強力なパスワードです');
  } else if (result.score >= 60) {
    result.feedback.push('強力なパスワードです');
  } else if (result.score >= 40) {
    result.feedback.push('中程度の強度のパスワードです');
  } else {
    result.feedback.push('パスワードが弱すぎます');
  }
  
  return result;
};

/**
 * パスワードのハッシュ化（bcrypt使用）
 */
export const hashPassword = async (password: string): Promise<{
  hash: string;
  salt: string;
  algorithm: string;
}> => {
  try {
    // パスワード強度の検証
    const strengthResult = validatePasswordStrength(password);
    if (!strengthResult.isValid) {
      throw new Error(`パスワードが要件を満たしていません: ${strengthResult.feedback.join(', ')}`);
    }
    
    // ソルトの生成
    const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
    
    // パスワードのハッシュ化
    const hash = await bcrypt.hash(password, salt);
    
    return {
      hash,
      salt,
      algorithm: 'bcrypt'
    };
  } catch (error) {
    throw new Error(`パスワードハッシュ化エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * パスワードの検証
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('パスワード検証エラー:', error);
    return false;
  }
};

/**
 * パスワードリセットトークンの生成
 */
export const generatePasswordResetToken = (): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} => {
  // 暗号学的に安全なランダムトークンの生成
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // トークンのハッシュ化（データベース保存用）
  const hashedToken = bcrypt.hashSync(token, PASSWORD_CONFIG.SALT_ROUNDS);
  
  // 有効期限の設定
  const expiresAt = new Date(Date.now() + PASSWORD_CONFIG.RESET_TOKEN_EXPIRY);
  
  return {
    token, // ユーザーに送信
    hashedToken, // データベースに保存
    expiresAt
  };
};

/**
 * パスワードリセットトークンの検証
 */
export const verifyPasswordResetToken = async (
  token: string,
  hashedToken: string,
  expiresAt: Date
): Promise<boolean> => {
  try {
    // 有効期限チェック
    if (new Date() > expiresAt) {
      return false;
    }
    
    // トークンの検証
    return await bcrypt.compare(token, hashedToken);
  } catch (error) {
    console.error('パスワードリセットトークン検証エラー:', error);
    return false;
  }
};

/**
 * パスワード履歴の管理
 */
export class PasswordHistory {
  /**
   * 新しいパスワードが過去に使用されていないかチェック
   */
  static async checkPasswordHistory(
    newPassword: string,
    passwordHistory: string[]
  ): Promise<boolean> {
    for (const historicalHash of passwordHistory) {
      const isUsedBefore = await verifyPassword(newPassword, historicalHash);
      if (isUsedBefore) {
        return false; // 過去に使用されている
      }
    }
    return true; // 新しいパスワード
  }
  
  /**
   * パスワード履歴を更新
   */
  static updatePasswordHistory(
    currentHistory: string[],
    newPasswordHash: string
  ): string[] {
    const updatedHistory = [newPasswordHash, ...currentHistory];
    
    // 履歴の長さを制限
    return updatedHistory.slice(0, PASSWORD_CONFIG.PASSWORD_HISTORY_COUNT);
  }
}

/**
 * パスワード変更の実装
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  passwordHistory: string[]
): Promise<{
  success: boolean;
  newPasswordHash?: string;
  message: string;
}> => {
  try {
    // 新しいパスワードの強度チェック
    const strengthResult = validatePasswordStrength(newPassword);
    if (!strengthResult.isValid) {
      return {
        success: false,
        message: `新しいパスワードが要件を満たしていません: ${strengthResult.feedback.join(', ')}`
      };
    }
    
    // パスワード履歴のチェック
    const isNewPassword = await PasswordHistory.checkPasswordHistory(newPassword, passwordHistory);
    if (!isNewPassword) {
      return {
        success: false,
        message: '過去に使用したパスワードは使用できません'
      };
    }
    
    // 新しいパスワードのハッシュ化
    const { hash: newPasswordHash } = await hashPassword(newPassword);
    
    return {
      success: true,
      newPasswordHash,
      message: 'パスワードが正常に変更されました'
    };
  } catch (error) {
    return {
      success: false,
      message: `パスワード変更エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * セキュリティ質問の管理
 */
export interface SecurityQuestion {
  id: string;
  question: string;
  hashedAnswer: string;
}

/**
 * セキュリティ質問の回答ハッシュ化
 */
export const hashSecurityAnswer = async (answer: string): Promise<string> => {
  // 回答を正規化（小文字、空白除去）
  const normalizedAnswer = answer.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // ハッシュ化
  const salt = await bcrypt.genSalt(PASSWORD_CONFIG.SALT_ROUNDS);
  return await bcrypt.hash(normalizedAnswer, salt);
};

/**
 * セキュリティ質問の回答検証
 */
export const verifySecurityAnswer = async (
  answer: string,
  hashedAnswer: string
): Promise<boolean> => {
  try {
    // 回答を正規化
    const normalizedAnswer = answer.toLowerCase().trim().replace(/\s+/g, ' ');
    
    return await bcrypt.compare(normalizedAnswer, hashedAnswer);
  } catch (error) {
    console.error('セキュリティ質問検証エラー:', error);
    return false;
  }
};

/**
 * パスワードセキュリティ監査
 */
export const auditPasswordSecurity = {
  /**
   * パスワード変更の監査ログ
   */
  logPasswordChange: async (userId: string, success: boolean, reason?: string) => {
    try {
      if (typeof window !== 'undefined' && (window as any).auditLogger) {
        await (window as any).auditLogger.logSecurityEvent('password_change', {
          userId,
          additional: {
            success,
            reason,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
      }
    } catch (error) {
      console.error('パスワード変更監査ログエラー:', error);
    }
  },
  
  /**
   * パスワードリセットの監査ログ
   */
  logPasswordReset: async (userId: string, method: 'email' | 'security_questions', success: boolean) => {
    try {
      if (typeof window !== 'undefined' && (window as any).auditLogger) {
        await (window as any).auditLogger.logSecurityEvent('password_reset', {
          userId,
          additional: {
            method,
            success,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        });
      }
    } catch (error) {
      console.error('パスワードリセット監査ログエラー:', error);
    }
  }
};

/**
 * パスワードセキュリティの設定取得
 */
export const getPasswordConfig = () => PASSWORD_CONFIG;

/**
 * パスワードポリシーのテキスト生成
 */
export const generatePasswordPolicyText = (): string => {
  const policy = [];
  
  policy.push(`${PASSWORD_CONFIG.MIN_LENGTH}文字以上${PASSWORD_CONFIG.MAX_LENGTH}文字以下`);
  
  if (PASSWORD_CONFIG.REQUIRE_UPPERCASE) policy.push('大文字を含む');
  if (PASSWORD_CONFIG.REQUIRE_LOWERCASE) policy.push('小文字を含む');
  if (PASSWORD_CONFIG.REQUIRE_NUMBERS) policy.push('数字を含む');
  if (PASSWORD_CONFIG.REQUIRE_SYMBOLS) policy.push('記号を含む');
  
  policy.push('よく使われるパスワードは避ける');
  policy.push('同じ文字の連続は避ける');
  
  return `パスワードは以下の要件を満たす必要があります：\n• ${policy.join('\n• ')}`;
};