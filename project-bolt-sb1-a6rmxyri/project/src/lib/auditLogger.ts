interface AuditLog {
  id?: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface LogContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  additional?: Record<string, any>;
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLocalLogs = 1000;
  private logToConsole = true;

  // ログエントリを作成
  private createLogEntry(
    action: string,
    resourceType: string,
    severity: AuditLog['severity'],
    context: LogContext = {},
    resourceId?: string,
    details?: Record<string, any>
  ): AuditLog {
    const timestamp = new Date().toISOString();
    
    return {
      user_id: context.userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        ...details,
        ...context.additional
      },
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      timestamp,
      severity
    };
  }

  // ローカルログストレージに保存
  private saveToLocalStorage(log: AuditLog): void {
    try {
      this.logs.push(log);
      
      // ログ数の制限
      if (this.logs.length > this.maxLocalLogs) {
        this.logs = this.logs.slice(-this.maxLocalLogs);
      }

      // コンソール出力
      if (this.logToConsole) {
        const logLevel = log.severity === 'critical' ? 'error' : 
                        log.severity === 'high' ? 'warn' : 'info';
        console[logLevel](`[AUDIT] ${log.action} on ${log.resource_type}`, {
          userId: log.user_id,
          details: log.details,
          timestamp: log.timestamp
        });
      }
    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }

  // ユーザー認証関連
  logAuthEvent(
    action: 'login' | 'logout' | 'login_attempt' | 'login_failed' | 'token_refresh',
    context: LogContext,
    details?: Record<string, any>
  ): void {
    const severity = action === 'login_failed' ? 'medium' : 'low';
    const log = this.createLogEntry(action, 'user_auth', severity, context, undefined, details);
    this.saveToLocalStorage(log);
  }

  // 管理者権限関連
  logAdminEvent(
    action: 'admin_access' | 'admin_denied' | 'admin_privilege_escalation',
    context: LogContext,
    resourceId?: string,
    details?: Record<string, any>
  ): void {
    const severity = action === 'admin_denied' ? 'medium' : 
                    action === 'admin_privilege_escalation' ? 'critical' : 'high';
    const log = this.createLogEntry(action, 'admin_access', severity, context, resourceId, details);
    this.saveToLocalStorage(log);
  }

  // ファイルアップロード関連
  logFileEvent(
    action: 'file_upload' | 'file_upload_failed' | 'file_validation_failed' | 'file_deleted',
    context: LogContext,
    resourceId?: string,
    details?: Record<string, any>
  ): void {
    const severity = action.includes('failed') ? 'medium' : 'low';
    const log = this.createLogEntry(action, 'file_operation', severity, context, resourceId, details);
    this.saveToLocalStorage(log);
  }

  // データベース操作関連
  logDatabaseEvent(
    action: 'create' | 'read' | 'update' | 'delete' | 'bulk_operation',
    table: string,
    context: LogContext,
    resourceId?: string,
    details?: Record<string, any>
  ): void {
    const severity = action === 'delete' || action === 'bulk_operation' ? 'high' : 'low';
    const log = this.createLogEntry(action, `database_${table}`, severity, context, resourceId, details);
    this.saveToLocalStorage(log);
  }

  // セキュリティイベント関連
  logSecurityEvent(
    action: 'csrf_violation' | 'rate_limit_exceeded' | 'suspicious_activity' | 'xss_attempt' | 'sql_injection_attempt',
    context: LogContext,
    details?: Record<string, any>
  ): void {
    const severity = action.includes('attempt') ? 'critical' : 'high';
    const log = this.createLogEntry(action, 'security_incident', severity, context, undefined, details);
    this.saveToLocalStorage(log);
  }

  // エラーイベント関連
  logError(
    error: Error,
    context: LogContext,
    action?: string,
    resourceType?: string
  ): void {
    const log = this.createLogEntry(
      action || 'application_error',
      resourceType || 'system',
      'medium',
      context,
      undefined,
      {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name
      }
    );
    this.saveToLocalStorage(log);
  }

  // ログの取得
  getLogs(
    filters: {
      severity?: AuditLog['severity'][];
      resourceType?: string[];
      userId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): AuditLog[] {
    let filteredLogs = [...this.logs];

    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => filters.severity!.includes(log.severity));
    }

    if (filters.resourceType) {
      filteredLogs = filteredLogs.filter(log => filters.resourceType!.includes(log.resource_type));
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.user_id === filters.userId);
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp! >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp! <= filters.endDate!);
    }

    // 最新順でソート
    filteredLogs.sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());

    if (filters.limit) {
      filteredLogs = filteredLogs.slice(0, filters.limit);
    }

    return filteredLogs;
  }

  // 統計情報の取得
  getStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    totalLogs: number;
    logsBySeverity: Record<string, number>;
    logsByAction: Record<string, number>;
    logsByResourceType: Record<string, number>;
    recentCriticalEvents: AuditLog[];
  } {
    const now = new Date();
    const timeRangeMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000
    }[timeRange];

    const startTime = new Date(now.getTime() - timeRangeMs).toISOString();
    const recentLogs = this.logs.filter(log => log.timestamp! >= startTime);

    const logsBySeverity: Record<string, number> = {};
    const logsByAction: Record<string, number> = {};
    const logsByResourceType: Record<string, number> = {};

    recentLogs.forEach(log => {
      logsBySeverity[log.severity] = (logsBySeverity[log.severity] || 0) + 1;
      logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;
      logsByResourceType[log.resource_type] = (logsByResourceType[log.resource_type] || 0) + 1;
    });

    const recentCriticalEvents = this.getLogs({
      severity: ['critical', 'high'],
      startDate: startTime,
      limit: 10
    });

    return {
      totalLogs: recentLogs.length,
      logsBySeverity,
      logsByAction,
      logsByResourceType,
      recentCriticalEvents
    };
  }

  // ログのエクスポート
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs();
    
    if (format === 'csv') {
      const headers = ['timestamp', 'user_id', 'action', 'resource_type', 'resource_id', 'severity', 'ip_address', 'details'];
      const csvRows = [
        headers.join(','),
        ...logs.map(log => [
          log.timestamp,
          log.user_id || '',
          log.action,
          log.resource_type,
          log.resource_id || '',
          log.severity,
          log.ip_address || '',
          JSON.stringify(log.details || {}).replace(/"/g, '""')
        ].map(field => `"${field}"`).join(','))
      ];
      return csvRows.join('\n');
    }

    return JSON.stringify(logs, null, 2);
  }

  // ログの削除（管理用）
  clearLogs(): void {
    this.logs = [];
    console.log('[AUDIT] All logs cleared');
  }
}

// シングルトンインスタンス
export const auditLogger = new AuditLogger();

// ブラウザ環境でのIPアドレス取得用ユーティリティ
export const getClientIP = async (): Promise<string> => {
  try {
    // 実際のプロダクションではより適切な方法でIPを取得
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Failed to get client IP:', error);
    return 'unknown';
  }
};

// コンテキスト情報を自動取得するヘルパー
export const createAuditContext = async (userId?: string, additional?: Record<string, any>): Promise<LogContext> => {
  return {
    userId,
    ipAddress: await getClientIP(),
    userAgent: navigator.userAgent,
    additional: {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      ...additional
    }
  };
};