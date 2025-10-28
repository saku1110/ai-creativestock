// XSS（Cross-Site Scripting）対策の強化実装
import DOMPurify from 'dompurify';

/**
 * XSS攻撃対策のためのサニタイゼーション機能
 */

// 危険なHTMLタグとその属性
const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 
  'textarea', 'select', 'button', 'link', 'meta', 'style', 'base'
];

const DANGEROUS_ATTRIBUTES = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus',
  'onblur', 'onchange', 'onsubmit', 'onreset', 'onkeydown', 'onkeyup',
  'onkeypress', 'javascript:', 'vbscript:', 'data:', 'src', 'href'
];

// XSS攻撃パターンの検出
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<form/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /document\.cookie/gi,
  /document\.write/gi,
  /window\.location/gi,
  /<svg.*onload/gi,
  /<img.*onerror/gi
];

/**
 * XSS攻撃パターンの検出
 */
export const detectXSS = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
};

/**
 * HTML文字列の厳格なサニタイゼーション
 */
export const sanitizeHTML = (input: string, options: {
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripTags?: boolean;
} = {}): string => {
  if (!input || typeof input !== 'string') return '';
  
  const {
    allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    allowedAttributes = ['class'],
    stripTags = false
  } = options;
  
  if (stripTags) {
    // すべてのHTMLタグを除去
    return input.replace(/<[^>]*>/g, '');
  }
  
  // DOMPurifyを使用した高度なサニタイゼーション
  const cleanHTML = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: allowedAttributes,
    FORBID_TAGS: DANGEROUS_TAGS,
    FORBID_ATTR: DANGEROUS_ATTRIBUTES,
    USE_PROFILES: { html: true },
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  });
  
  return cleanHTML;
};

/**
 * 文字列のHTMLエスケープ
 */
export const escapeHTML = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  const htmlEscapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return str.replace(/[&<>"'`=\/]/g, (match) => htmlEscapeMap[match]);
};

/**
 * HTMLエスケープの逆変換
 */
export const unescapeHTML = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  
  const htmlUnescapeMap: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return str.replace(/(&amp;|&lt;|&gt;|&quot;|&#x27;|&#x2F;|&#x60;|&#x3D;)/g, 
    (match) => htmlUnescapeMap[match]);
};

/**
 * URL安全性チェック
 */
export const isValidURL = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    
    // 危険なプロトコルをブロック
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
    if (dangerousProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
      return false;
    }
    
    // HTTPまたはHTTPSのみ許可
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * CSS安全性チェック
 */
export const sanitizeCSS = (css: string): string => {
  if (!css || typeof css !== 'string') return '';
  
  // 危険なCSSプロパティとバリューを除去
  const dangerousPatterns = [
    /expression\s*\(/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
    /url\s*\(\s*["']?javascript:/gi,
    /url\s*\(\s*["']?data:/gi,
    /@import/gi,
    /@charset/gi
  ];
  
  let sanitizedCSS = css;
  dangerousPatterns.forEach(pattern => {
    sanitizedCSS = sanitizedCSS.replace(pattern, '');
  });
  
  return sanitizedCSS;
};

/**
 * JSON安全性チェック
 */
export const sanitizeJSON = (jsonString: string): any => {
  if (!jsonString || typeof jsonString !== 'string') return null;
  
  try {
    // JSONパースの前にXSSパターンをチェック
    if (detectXSS(jsonString)) {
      throw new Error('JSONにXSSパターンが検出されました');
    }
    
    const parsed = JSON.parse(jsonString);
    
    // パースされたオブジェクトを再帰的にサニタイズ
    return sanitizeObject(parsed);
  } catch (error) {
    console.warn('JSONサニタイゼーションエラー:', error);
    return null;
  }
};

/**
 * オブジェクトの再帰的サニタイゼーション
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return escapeHTML(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const sanitizedKey = escapeHTML(key);
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    });
    return sanitized;
  }
  
  return obj;
};

/**
 * ファイルアップロード安全性チェック
 */
export const validateFileUpload = (file: File): {
  valid: boolean;
  reason?: string;
} => {
  // ファイルサイズチェック（100MBまで）
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, reason: 'ファイルサイズが大きすぎます' };
  }
  
  // 許可されたMIMEタイプ
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'application/pdf', 'text/plain'
  ];
  
  if (!allowedMimeTypes.includes(file.type)) {
    return { valid: false, reason: '許可されていないファイル形式です' };
  }
  
  // ファイル名の安全性チェック
  const fileName = file.name;
  if (detectXSS(fileName) || /[<>:"/\\|?*]/.test(fileName)) {
    return { valid: false, reason: 'ファイル名に不正な文字が含まれています' };
  }
  
  return { valid: true };
};

/**
 * Reactコンポーネント用の安全なHTML表示（別ファイルで実装推奨）
 */
export const createSafeHTML = (
  html: string,
  allowedTags?: string[],
  allowedAttributes?: string[]
): string => {
  return sanitizeHTML(html, { allowedTags, allowedAttributes });
};

/**
 * XSS監視とアラート
 */
export const setupXSSMonitoring = () => {
  // CSPバイオレーション監視
  if (typeof window !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error('CSP違反検出:', {
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        originalPolicy: event.originalPolicy
      });
      
      // 監査ログに記録
      if ((window as any).auditLogger) {
        (window as any).auditLogger.logSecurityEvent('csp_violation', {
          userId: undefined,
          additional: {
            directive: event.violatedDirective,
            blockedURI: event.blockedURI,
            userAgent: navigator.userAgent
          }
        });
      }
    });
  }
};

/**
 * XSSテスト用のペイロード検出
 */
export const detectXSSTestPayloads = (input: string): boolean => {
  const testPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '"><script>alert("XSS")</script>',
    "'><script>alert('XSS')</script>",
    '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>'
  ];
  
  const normalizedInput = input.toLowerCase();
  return testPayloads.some(payload => 
    normalizedInput.includes(payload.toLowerCase())
  );
};

/**
 * XSS攻撃試行の監査ログ
 */
export const logXSSAttempt = async (
  input: string,
  userId?: string,
  context?: string
) => {
  try {
    if (typeof window !== 'undefined' && (window as any).auditLogger) {
      await (window as any).auditLogger.logSecurityEvent('xss_attempt', {
        userId,
        additional: {
          input: input.substring(0, 500), // 最初の500文字のみログ
          context,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      });
    }
  } catch (error) {
    console.error('XSS試行ログの記録に失敗:', error);
  }
};

/**
 * 入力値のリアルタイムXSSチェック
 */
export const useXSSProtection = (value: string, context?: string) => {
  if (detectXSS(value) || detectXSSTestPayloads(value)) {
    logXSSAttempt(value, undefined, context);
    throw new Error('入力値に不正なコードが検出されました。');
  }
  
  return escapeHTML(value);
};

// DOMPurifyの設定をカスタマイズ
if (typeof window !== 'undefined') {
  DOMPurify.addHook('beforeSanitizeElements', (node) => {
    // 特定の要素を監視
    if (node.tagName && DANGEROUS_TAGS.includes(node.tagName.toLowerCase())) {
      logXSSAttempt(`Dangerous tag detected: ${node.tagName}`, undefined, 'DOMPurify');
    }
  });
}