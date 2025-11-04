// 入力値サニタイゼーションとバリデーションの強化
import { detectXSS, escapeHTML } from './xssSecurity';
import { detectSQLInjection } from './sqlSecurity';

/**
 * 入力値の種類別セキュリティ設定
 */
export enum InputType {
  TEXT = 'text',
  EMAIL = 'email',
  PASSWORD = 'password',
  URL = 'url',
  PHONE = 'phone',
  NAME = 'name',
  SEARCH = 'search',
  DESCRIPTION = 'description',
  FILENAME = 'filename',
  JSON = 'json',
  NUMBER = 'number',
  DATE = 'date'
}

/**
 * サニタイゼーション設定
 */
interface SanitizationConfig {
  maxLength: number;
  allowHTML: boolean;
  allowSpecialChars: boolean;
  trimWhitespace: boolean;
  toLowerCase: boolean;
  removeLineBreaks: boolean;
  customPattern?: RegExp;
  customReplace?: string;
}

/**
 * 入力タイプ別のデフォルト設定
 */
const DEFAULT_CONFIGS: Record<InputType, SanitizationConfig> = {
  [InputType.TEXT]: {
    maxLength: 1000,
    allowHTML: false,
    allowSpecialChars: true,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: false
  },
  [InputType.EMAIL]: {
    maxLength: 254,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: true,
    removeLineBreaks: true,
    customPattern: /[^a-zA-Z0-9@._-]/g,
    customReplace: ''
  },
  [InputType.PASSWORD]: {
    maxLength: 128,
    allowHTML: false,
    allowSpecialChars: true,
    trimWhitespace: false,
    toLowerCase: false,
    removeLineBreaks: true
  },
  [InputType.URL]: {
    maxLength: 2048,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: true,
    removeLineBreaks: true,
    customPattern: /[^a-zA-Z0-9:\/\-._~:?#[\]@!$&'()*+,;=%]/g,
    customReplace: ''
  },
  [InputType.PHONE]: {
    maxLength: 20,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true,
    customPattern: /[^0-9+\-() ]/g,
    customReplace: ''
  },
  [InputType.NAME]: {
    maxLength: 100,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true,
    customPattern: /[^a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF\s'-]/g,
    customReplace: ''
  },
  [InputType.SEARCH]: {
    maxLength: 200,
    allowHTML: false,
    allowSpecialChars: true,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true
  },
  [InputType.DESCRIPTION]: {
    maxLength: 5000,
    allowHTML: false,
    allowSpecialChars: true,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: false
  },
  [InputType.FILENAME]: {
    maxLength: 255,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true,
    customPattern: /[<>:"/\\|?*\x00-\x1f]/g,
    customReplace: '_'
  },
  [InputType.JSON]: {
    maxLength: 10000,
    allowHTML: false,
    allowSpecialChars: true,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: false
  },
  [InputType.NUMBER]: {
    maxLength: 20,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true,
    customPattern: /[^0-9.\-]/g,
    customReplace: ''
  },
  [InputType.DATE]: {
    maxLength: 30,
    allowHTML: false,
    allowSpecialChars: false,
    trimWhitespace: true,
    toLowerCase: false,
    removeLineBreaks: true,
    customPattern: /[^0-9\-T:Z.]/g,
    customReplace: ''
  }
};

/**
 * バリデーション結果
 */
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
  originalLength: number;
  finalLength: number;
}

/**
 * 包括的な入力値サニタイゼーション
 */
export const sanitizeInput = (
  input: string,
  type: InputType,
  customConfig?: Partial<SanitizationConfig>
): ValidationResult => {
  const result: ValidationResult = {
    isValid: true,
    sanitizedValue: '',
    errors: [],
    warnings: [],
    originalLength: 0,
    finalLength: 0
  };
  
  // 入力値のチェック
  if (input === null || input === undefined) {
    result.errors.push('入力値が null または undefined です');
    result.isValid = false;
    return result;
  }
  
  if (typeof input !== 'string') {
    input = String(input);
    result.warnings.push('入力値を文字列に変換しました');
  }
  
  result.originalLength = input.length;
  let sanitized = input;
  
  // 設定のマージ
  const config = { ...DEFAULT_CONFIGS[type], ...customConfig };
  
  try {
    // セキュリティ脅威の検出
    if (detectXSS(sanitized)) {
      result.errors.push('XSS攻撃パターンが検出されました');
      result.isValid = false;
    }
    
    if (detectSQLInjection(sanitized)) {
      result.errors.push('SQLインジェクション攻撃パターンが検出されました');
      result.isValid = false;
    }
    
    // 基本的なサニタイゼーション
    if (config.trimWhitespace) {
      sanitized = sanitized.trim();
    }
    
    if (config.removeLineBreaks) {
      sanitized = sanitized.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ');
    }
    
    if (config.toLowerCase) {
      sanitized = sanitized.toLowerCase();
    }
    
    // HTMLの処理
    if (!config.allowHTML) {
      if (/<[^>]*>/g.test(sanitized)) {
        result.warnings.push('HTMLタグが検出され、除去されました');
        sanitized = escapeHTML(sanitized);
      }
    }
    
    // 特殊文字の処理
    if (!config.allowSpecialChars && config.customPattern) {
      const originalSanitized = sanitized;
      sanitized = sanitized.replace(config.customPattern, config.customReplace || '');
      if (originalSanitized !== sanitized) {
        result.warnings.push('不正な文字が除去または置換されました');
      }
    }
    
    // 長さの制限
    if (sanitized.length > config.maxLength) {
      result.warnings.push(`入力値が最大長(${config.maxLength})を超えています`);
      sanitized = sanitized.substring(0, config.maxLength);
    }
    
    // タイプ別の特別な検証
    const typeValidation = validateByType(sanitized, type);
    if (!typeValidation.isValid) {
      result.errors.push(...typeValidation.errors);
      result.isValid = false;
    }
    
    result.sanitizedValue = sanitized;
    result.finalLength = sanitized.length;
    
  } catch (error) {
    result.errors.push(`サニタイゼーション中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.isValid = false;
  }
  
  return result;
};

/**
 * タイプ別の特別な検証
 */
const validateByType = (value: string, type: InputType): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  switch (type) {
    case InputType.EMAIL:
      if (value && !isValidEmail(value)) {
        errors.push('有効なメールアドレス形式ではありません');
      }
      break;
    
    case InputType.URL:
      if (value && !isValidURL(value)) {
        errors.push('有効なURL形式ではありません');
      }
      break;
    
    case InputType.PHONE:
      if (value && !isValidPhoneNumber(value)) {
        errors.push('有効な電話番号形式ではありません');
      }
      break;
    
    case InputType.NUMBER:
      if (value && !isValidNumber(value)) {
        errors.push('有効な数値形式ではありません');
      }
      break;
    
    case InputType.DATE:
      if (value && !isValidDate(value)) {
        errors.push('有効な日付形式ではありません');
      }
      break;
    
    case InputType.JSON:
      if (value && !isValidJSON(value)) {
        errors.push('有効なJSON形式ではありません');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * メールアドレスの検証
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * URLの検証
 */
const isValidURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * 電話番号の検証（日本の形式）
 */
const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+81|0)[0-9]{1,4}-?[0-9]{1,4}-?[0-9]{3,4}$/;
  return phoneRegex.test(phone);
};

/**
 * 数値の検証
 */
const isValidNumber = (num: string): boolean => {
  return !isNaN(Number(num)) && isFinite(Number(num));
};

/**
 * 日付の検証
 */
const isValidDate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
};

/**
 * JSONの検証
 */
const isValidJSON = (json: string): boolean => {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
};

/**
 * バッチサニタイゼーション（オブジェクト）
 */
export const sanitizeObject = (
  obj: Record<string, any>,
  typeMapping: Record<string, InputType>,
  customConfigs?: Record<string, Partial<SanitizationConfig>>
): {
  sanitizedObject: Record<string, any>;
  validationResults: Record<string, ValidationResult>;
  isValid: boolean;
} => {
  const sanitizedObject: Record<string, any> = {};
  const validationResults: Record<string, ValidationResult> = {};
  let isValid = true;
  
  Object.entries(obj).forEach(([key, value]) => {
    if (typeMapping[key] && typeof value === 'string') {
      const customConfig = customConfigs?.[key];
      const result = sanitizeInput(value, typeMapping[key], customConfig);
      
      sanitizedObject[key] = result.sanitizedValue;
      validationResults[key] = result;
      
      if (!result.isValid) {
        isValid = false;
      }
    } else {
      sanitizedObject[key] = value;
    }
  });
  
  return {
    sanitizedObject,
    validationResults,
    isValid
  };
};

/**
 * React Hook for input sanitization
 */
export const useInputSanitization = (type: InputType, customConfig?: Partial<SanitizationConfig>) => {
  const sanitize = (value: string) => {
    return sanitizeInput(value, type, customConfig);
  };
  
  const validateAndSanitize = (value: string) => {
    const result = sanitize(value);
    
    if (!result.isValid) {
      throw new Error(result.errors.join(', '));
    }
    
    return result.sanitizedValue;
  };
  
  return {
    sanitize,
    validateAndSanitize,
    getConfig: () => ({ ...DEFAULT_CONFIGS[type], ...customConfig })
  };
};

/**
 * フォームデータの一括サニタイゼーション
 */
export const sanitizeFormData = (
  formData: FormData,
  typeMapping: Record<string, InputType>
): {
  sanitizedData: Record<string, string>;
  validationResults: Record<string, ValidationResult>;
  isValid: boolean;
} => {
  const sanitizedData: Record<string, string> = {};
  const validationResults: Record<string, ValidationResult> = {};
  let isValid = true;
  
  for (const [key, value] of formData.entries()) {
    if (typeMapping[key] && typeof value === 'string') {
      const result = sanitizeInput(value, typeMapping[key]);
      
      sanitizedData[key] = result.sanitizedValue;
      validationResults[key] = result;
      
      if (!result.isValid) {
        isValid = false;
      }
    }
  }
  
  return {
    sanitizedData,
    validationResults,
    isValid
  };
};

/**
 * 入力値の統計情報
 */
export const getInputStatistics = (results: Record<string, ValidationResult>) => {
  const stats = {
    totalFields: Object.keys(results).length,
    validFields: 0,
    invalidFields: 0,
    fieldsWithWarnings: 0,
    totalErrors: 0,
    totalWarnings: 0,
    avgCompressionRatio: 0
  };
  
  let totalCompressionRatio = 0;
  
  Object.values(results).forEach(result => {
    if (result.isValid) {
      stats.validFields++;
    } else {
      stats.invalidFields++;
    }
    
    if (result.warnings.length > 0) {
      stats.fieldsWithWarnings++;
    }
    
    stats.totalErrors += result.errors.length;
    stats.totalWarnings += result.warnings.length;
    
    if (result.originalLength > 0) {
      totalCompressionRatio += result.finalLength / result.originalLength;
    }
  });
  
  stats.avgCompressionRatio = totalCompressionRatio / stats.totalFields;
  
  return stats;
};

/**
 * セキュリティイベントのログ記録
 */
export const logSecurityEvent = async (
  eventType: 'xss_detected' | 'sql_injection_detected' | 'input_sanitized',
  details: {
    inputType: InputType;
    originalValue: string;
    sanitizedValue: string;
    userId?: string;
    context?: string;
  }
) => {
  try {
    if (typeof window !== 'undefined' && (window as any).auditLogger) {
      await (window as any).auditLogger.logSecurityEvent(eventType, {
        userId: details.userId,
        additional: {
          inputType: details.inputType,
          originalLength: details.originalValue.length,
          finalLength: details.sanitizedValue.length,
          context: details.context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });
    }
  } catch (error) {
    console.error('入力セキュリティイベントログエラー:', error);
  }
};