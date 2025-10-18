interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstHit: number;
  lastHit: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface DDoSProtectionConfig {
  burstThreshold: number;
  burstWindowMs: number;
  suspiciousThreshold: number;
  blockDurationMs: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private blockedIPs: Map<string, number> = new Map();
  private config: RateLimitConfig;
  private ddosConfig: DDoSProtectionConfig;

  constructor(
    config: RateLimitConfig = { windowMs: 15 * 60 * 1000, maxRequests: 100 },
    ddosConfig: DDoSProtectionConfig = {
      burstThreshold: 30,
      burstWindowMs: 10 * 1000,
      suspiciousThreshold: 5,
      blockDurationMs: 60 * 60 * 1000
    }
  ) {
    this.config = config;
    this.ddosConfig = ddosConfig;
    
    // 期限切れエントリを定期的にクリーンアップ
    setInterval(() => this.cleanup(), this.config.windowMs);
    setInterval(() => this.cleanupBlockedIPs(), this.ddosConfig.blockDurationMs);
  }

  // レート制限チェック（DDoS保護機能付き）
  checkLimit(identifier: string, requestSuccess?: boolean): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number;
    isDDoSDetected: boolean;
    isBlocked: boolean;
  } {
    const now = Date.now();
    const key = this.getKey(identifier);
    
    // ブロック済みIPのチェック
    const blockExpiry = this.blockedIPs.get(identifier);
    if (blockExpiry && now < blockExpiry) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockExpiry,
        isDDoSDetected: false,
        isBlocked: true
      };
    }

    // レート制限設定に基づく成功/失敗リクエストのスキップ
    if (requestSuccess !== undefined) {
      if (this.config.skipSuccessfulRequests && requestSuccess) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: now + this.config.windowMs,
          isDDoSDetected: false,
          isBlocked: false
        };
      }
      if (this.config.skipFailedRequests && !requestSuccess) {
        return {
          allowed: true,
          remaining: this.config.maxRequests,
          resetTime: now + this.config.windowMs,
          isDDoSDetected: false,
          isBlocked: false
        };
      }
    }
    
    let entry = this.store.get(key);
    
    // エントリが存在しないか期限切れの場合、新しく作成
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        firstHit: now,
        lastHit: now
      };
    }

    // DDoS攻撃の検出
    const isDDoSDetected = this.detectDDoS(entry, now);
    if (isDDoSDetected) {
      // IPをブロック
      this.blockedIPs.set(identifier, now + this.ddosConfig.blockDurationMs);
      
      // 監査ログに記録（auditLoggerが利用可能な場合）
      if (typeof window !== 'undefined' && (window as any).auditLogger) {
        (window as any).auditLogger.logSecurityEvent('ddos_detected', {
          userId: undefined,
          additional: {
            identifier,
            requestCount: entry.count,
            timeWindow: now - entry.firstHit,
            blockedUntil: new Date(now + this.ddosConfig.blockDurationMs).toISOString()
          }
        });
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        isDDoSDetected: true,
        isBlocked: true
      };
    }

    // リクエスト数をインクリメント
    entry.count++;
    entry.lastHit = now;
    this.store.set(key, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      isDDoSDetected: false,
      isBlocked: false
    };
  }

  // DDoS攻撃の検出ロジック
  private detectDDoS(entry: RateLimitEntry, now: number): boolean {
    // バースト攻撃の検出：短時間での大量リクエスト
    const timeDiff = now - entry.firstHit;
    if (timeDiff < this.ddosConfig.burstWindowMs && entry.count > this.ddosConfig.burstThreshold) {
      return true;
    }

    // 継続的な攻撃の検出：通常の制限を大幅に超過
    const normalThreshold = this.config.maxRequests * this.ddosConfig.suspiciousThreshold;
    if (entry.count > normalThreshold) {
      return true;
    }

    return false;
  }

  // 特定のユーザーのレート制限をリセット
  resetLimit(identifier: string): void {
    const key = this.getKey(identifier);
    this.store.delete(key);
    this.blockedIPs.delete(identifier);
  }

  // IPブロックを手動で解除
  unblockIP(identifier: string): void {
    this.blockedIPs.delete(identifier);
  }

  // 現在ブロックされているIPのリストを取得
  getBlockedIPs(): Array<{ identifier: string; blockedUntil: Date }> {
    const now = Date.now();
    const blocked: Array<{ identifier: string; blockedUntil: Date }> = [];
    
    for (const [identifier, blockExpiry] of this.blockedIPs.entries()) {
      if (now < blockExpiry) {
        blocked.push({
          identifier,
          blockedUntil: new Date(blockExpiry)
        });
      }
    }
    
    return blocked;
  }

  // 期限切れエントリをクリーンアップ
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  // ブロック済みIPのクリーンアップ
  private cleanupBlockedIPs(): void {
    const now = Date.now();
    for (const [identifier, blockExpiry] of this.blockedIPs.entries()) {
      if (now >= blockExpiry) {
        this.blockedIPs.delete(identifier);
      }
    }
  }

  // キーを生成（IPアドレスやユーザーIDベース）
  private getKey(identifier: string): string {
    return `rate_limit:${identifier}`;
  }

  // 現在の統計を取得
  getStats(): { 
    totalEntries: number; 
    activeEntries: number; 
    blockedIPs: number;
    ddosDetections: number;
  } {
    const now = Date.now();
    let activeEntries = 0;
    let blockedIPs = 0;
    let ddosDetections = 0;
    
    for (const entry of this.store.values()) {
      if (now < entry.resetTime) {
        activeEntries++;
        
        // DDoS攻撃の可能性があるエントリをカウント
        if (this.detectDDoS(entry, now)) {
          ddosDetections++;
        }
      }
    }
    
    for (const blockExpiry of this.blockedIPs.values()) {
      if (now < blockExpiry) {
        blockedIPs++;
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries,
      blockedIPs,
      ddosDetections
    };
  }
}

// グローバルレート制限インスタンス（DDoS保護付き）
export const globalRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}, {
  burstThreshold: 50,
  burstWindowMs: 30 * 1000, // 30秒
  suspiciousThreshold: 3,
  blockDurationMs: 60 * 60 * 1000 // 1時間ブロック
});

// API用レート制限（より厳しい制限、DDoS保護強化）
export const apiRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5分
  maxRequests: 20,
  skipSuccessfulRequests: false,
  skipFailedRequests: true // 失敗したリクエストはカウントしない
}, {
  burstThreshold: 15,
  burstWindowMs: 10 * 1000, // 10秒
  suspiciousThreshold: 2,
  blockDurationMs: 30 * 60 * 1000 // 30分ブロック
});

// ファイルアップロード用レート制限（非常に厳しい制限、DDoS保護最強）
export const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1時間
  maxRequests: 5,
  skipSuccessfulRequests: false,
  skipFailedRequests: false
}, {
  burstThreshold: 3,
  burstWindowMs: 60 * 1000, // 1分
  suspiciousThreshold: 1.5,
  blockDurationMs: 24 * 60 * 60 * 1000 // 24時間ブロック
});

// 認証試行用レート制限（ブルートフォース攻撃対策）
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15分
  maxRequests: 5, // 15分で5回まで
  skipSuccessfulRequests: true, // 成功した認証はカウントしない
  skipFailedRequests: false
}, {
  burstThreshold: 3,
  burstWindowMs: 60 * 1000, // 1分
  suspiciousThreshold: 1,
  blockDurationMs: 60 * 60 * 1000 // 1時間ブロック
});

// レート制限ミドルウェア関数（DDoS保護機能付き）
export const withRateLimit = async <T>(
  identifier: string,
  operation: () => Promise<T>,
  limiter: RateLimiter = globalRateLimiter
): Promise<T> => {
  let requestSuccess: boolean | undefined;
  
  try {
    const { allowed, remaining, resetTime, isDDoSDetected, isBlocked } = limiter.checkLimit(identifier);
    
    if (isBlocked) {
      const resetDate = new Date(resetTime);
      if (isDDoSDetected) {
        throw new Error(
          `DDoS攻撃を検出したため、アクセスをブロックしました。${resetDate.toLocaleString()}以降に再試行してください。`
        );
      } else {
        throw new Error(
          `IPアドレスがブロックされています。${resetDate.toLocaleString()}以降に再試行してください。`
        );
      }
    }
    
    if (!allowed) {
      const resetDate = new Date(resetTime);
      throw new Error(
        `レート制限に達しました。${resetDate.toLocaleTimeString()}以降に再試行してください。`
      );
    }

    // X-RateLimit ヘッダー情報をコンソールに出力（デバッグ用）
    console.log(`Rate Limit - Remaining: ${remaining}, Reset: ${new Date(resetTime).toLocaleTimeString()}`);
    
    const result = await operation();
    requestSuccess = true;
    
    // 成功した場合、必要に応じて再チェック（成功リクエストをスキップする設定の場合）
    if (limiter.config?.skipSuccessfulRequests) {
      limiter.checkLimit(identifier, requestSuccess);
    }
    
    return result;
  } catch (error) {
    requestSuccess = false;
    
    // 失敗した場合、必要に応じて再チェック（失敗リクエストをスキップする設定の場合）
    if (limiter.config?.skipFailedRequests) {
      limiter.checkLimit(identifier, requestSuccess);
    }
    
    throw error;
  }
};

// DDoS攻撃監視とアラート機能
export const setupDDoSMonitoring = () => {
  const monitoringInterval = 60 * 1000; // 1分間隔で監視
  
  const checkDDoSStatus = () => {
    const stats = globalRateLimiter.getStats();
    
    // 警告レベルの判定
    if (stats.ddosDetections > 0) {
      console.warn(`🚨 DDoS攻撃を検出: ${stats.ddosDetections}件`);
      
      // 監査ログに記録
      if (typeof window !== 'undefined' && (window as any).auditLogger) {
        (window as any).auditLogger.logSecurityEvent('ddos_monitoring_alert', {
          userId: undefined,
          additional: {
            ddosDetections: stats.ddosDetections,
            blockedIPs: stats.blockedIPs,
            activeEntries: stats.activeEntries
          }
        });
      }
    }
    
    if (stats.blockedIPs > 10) {
      console.warn(`⚠️ 大量のIPブロック: ${stats.blockedIPs}個のIPがブロック中`);
    }
    
    // 統計情報をコンソールに出力（開発環境のみ）
    if ((import.meta as any).env?.DEV) {
      console.log('📊 Rate Limiter Stats:', stats);
    }
  };
  
  // 定期監視の開始
  setInterval(checkDDoSStatus, monitoringInterval);
  
  return {
    stop: () => clearInterval(monitoringInterval),
    getStats: () => globalRateLimiter.getStats(),
    getBlockedIPs: () => globalRateLimiter.getBlockedIPs()
  };
};

// ユーザーベースの識別子を生成
export const getUserIdentifier = (userId?: string, fallbackIP?: string): string => {
  if (userId) {
    return `user:${userId}`;
  }
  if (fallbackIP) {
    return `ip:${fallbackIP}`;
  }
  // フォールバック：ブラウザフィンガープリント
  const fingerprint = navigator.userAgent + navigator.language + screen.width + screen.height;
  return `fingerprint:${btoa(fingerprint).slice(0, 16)}`;
};
