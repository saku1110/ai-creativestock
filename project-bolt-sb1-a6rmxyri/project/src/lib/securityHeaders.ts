// セキュリティヘッダーの設定と管理
interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
  'X-Download-Options'?: string;
  'X-Permitted-Cross-Domain-Policies'?: string;
}

export class SecurityHeaderManager {
  private static instance: SecurityHeaderManager;
  private headers: SecurityHeaders;

  private constructor() {
    this.headers = this.getDefaultHeaders();
  }

  public static getInstance(): SecurityHeaderManager {
    if (!SecurityHeaderManager.instance) {
      SecurityHeaderManager.instance = new SecurityHeaderManager();
    }
    return SecurityHeaderManager.instance;
  }

  // デフォルトのセキュリティヘッダーを取得
  private getDefaultHeaders(): SecurityHeaders {
    return {
      // CSP: 厳格なコンテンツセキュリティポリシー
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.supabase.co",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https://*.supabase.co",
        "media-src 'self' blob: https://*.supabase.co",
        "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.ipify.org",
        "frame-src 'self' https://js.stripe.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; '),

      // XSSプロテクション
      'X-XSS-Protection': '1; mode=block',

      // コンテンツタイプスニッフィング無効化
      'X-Content-Type-Options': 'nosniff',

      // フレーム埋め込み防止
      'X-Frame-Options': 'DENY',

      // HTTPS強制（本番環境）
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

      // リファラーポリシー
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // 権限ポリシー
      'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=(self)',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=(self)'
      ].join(', '),

      // IE用ダウンロードオプション
      'X-Download-Options': 'noopen',

      // Flash等のクロスドメインポリシー
      'X-Permitted-Cross-Domain-Policies': 'none'
    };
  }

  // ヘッダーを取得
  public getHeaders(): SecurityHeaders {
    return { ...this.headers };
  }

  // 特定のヘッダーを設定
  public setHeader(name: keyof SecurityHeaders, value: string): void {
    this.headers[name] = value;
  }

  // CSPディレクティブを追加
  public addCSPDirective(directive: string, values: string[]): void {
    const currentCSP = this.headers['Content-Security-Policy'] || '';
    const directives = currentCSP.split('; ').filter(d => !d.startsWith(directive));
    
    directives.push(`${directive} ${values.join(' ')}`);
    this.headers['Content-Security-Policy'] = directives.join('; ');
  }

  // 開発環境用の緩いCSP設定
  public setDevelopmentMode(): void {
    this.headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' https: data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https: ws: wss:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
  }

  // メタタグとしてHTMLに挿入するためのヘッダーを取得
  public getMetaTags(): string[] {
    const metaTags: string[] = [];
    
    Object.entries(this.headers).forEach(([name, value]) => {
      if (value && name === 'Content-Security-Policy') {
        metaTags.push(`<meta http-equiv="${name}" content="${value}">`);
      }
    });

    return metaTags;
  }

  // Express.js用のミドルウェア関数を生成
  public createExpressMiddleware() {
    return (req: any, res: any, next: any) => {
      Object.entries(this.headers).forEach(([name, value]) => {
        if (value) {
          res.setHeader(name, value);
        }
      });
      next();
    };
  }

  // セキュリティヘッダーの検証
  public validateHeaders(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let valid = true;

    // CSPの存在チェック
    if (!this.headers['Content-Security-Policy']) {
      warnings.push('Content-Security-Policy が設定されていません');
      valid = false;
    }

    // XSSプロテクションのチェック
    if (!this.headers['X-XSS-Protection']) {
      warnings.push('X-XSS-Protection が設定されていません');
    }

    // フレームオプションのチェック
    if (!this.headers['X-Frame-Options']) {
      warnings.push('X-Frame-Options が設定されていません');
    }

    // HTTPS強制のチェック（本番環境）
    if ((import.meta as any).env?.PROD && !this.headers['Strict-Transport-Security']) {
      warnings.push('本番環境で Strict-Transport-Security が設定されていません');
    }

    return { valid, warnings };
  }

  // ログとして出力
  public logConfiguration(): void {
    console.log('🛡️ Security Headers Configuration:');
    Object.entries(this.headers).forEach(([name, value]) => {
      if (value) {
        console.log(`  ${name}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
      }
    });

    const validation = this.validateHeaders();
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Security Header Warnings:');
      validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  }
}

// シングルトンインスタンス
export const securityHeaders = SecurityHeaderManager.getInstance();

// ブラウザ環境でのCSP違反監視
export const setupCSPViolationMonitoring = () => {
  if (typeof window !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error('CSP Violation:', {
        blockedURI: event.blockedURI,
        directive: event.violatedDirective,
        originalPolicy: event.originalPolicy,
        referrer: event.referrer,
        statusCode: event.statusCode
      });

      // 監査ログに記録（監査ログシステムが利用可能な場合）
      if (typeof window !== 'undefined' && (window as any).auditLogger) {
        (window as any).auditLogger.logSecurityEvent('csp_violation', {
          userId: undefined, // CSP違反時はユーザー情報が取得できない場合がある
          additional: {
            blockedURI: event.blockedURI,
            directive: event.violatedDirective,
            referrer: event.referrer
          }
        });
      }
    });
  }
};

// React用のヘッダーコンポーネント（別ファイルで実装推奨）
export const getSecurityMetaTagsHTML = (): string => {
  const metaTags = securityHeaders.getMetaTags();
  return metaTags.join('\n');
};
