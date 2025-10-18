import React from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { AppError } from '../hooks/useErrorHandler';

interface ErrorToastProps {
  errors: AppError[];
  onRemove: (timestamp: Date) => void;
  onClearAll: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ErrorToast: React.FC<ErrorToastProps> = ({ 
  errors, 
  onRemove, 
  onClearAll,
  position = 'top-right' 
}) => {
  if (errors.length === 0) return null;

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4';
      case 'top-right': return 'top-4 right-4';
      case 'bottom-left': return 'bottom-4 left-4';
      case 'bottom-right': return 'bottom-4 right-4';
      default: return 'top-4 right-4';
    }
  };

  const getErrorIcon = (type: AppError['type']) => {
    switch (type) {
      case 'network':
      case 'server':
        return <AlertTriangle className="w-5 h-5" />;
      case 'auth':
        return <AlertCircle className="w-5 h-5" />;
      case 'validation':
      case 'client':
        return <Info className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getErrorColors = (type: AppError['type']) => {
    switch (type) {
      case 'server':
        return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'network':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-400';
      case 'auth':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-400';
      case 'validation':
      case 'client':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
      default:
        return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    }
  };

  const getSeverityIndicator = (error: AppError) => {
    const severity = getSeverity(error);
    switch (severity) {
      case 'critical':
        return <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />;
      case 'high':
        return <div className="w-2 h-2 bg-orange-500 rounded-full" />;
      case 'medium':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'low':
        return <div className="w-2 h-2 bg-blue-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getSeverity = (error: AppError): 'low' | 'medium' | 'high' | 'critical' => {
    switch (error.type) {
      case 'auth': return 'high';
      case 'server': return 'critical';
      case 'network': return 'medium';
      case 'validation': return 'low';
      default: return 'medium';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    return `${hours}時間前`;
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full space-y-2`}>
      {/* クリアボタン（複数エラーがある場合） */}
      {errors.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="text-xs text-gray-400 hover:text-white transition-colors bg-gray-800/50 px-2 py-1 rounded"
          >
            すべて削除
          </button>
        </div>
      )}

      {/* エラートースト一覧 */}
      {errors.slice(-5).map((error) => (
        <div
          key={error.timestamp.getTime()}
          className={`glass-dark border rounded-xl p-4 shadow-lg animate-slide-in-right ${getErrorColors(error.type)}`}
        >
          <div className="flex items-start space-x-3">
            {/* アイコンと重要度インジケーター */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {getErrorIcon(error.type)}
              {getSeverityIndicator(error)}
            </div>

            {/* エラー内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                    {error.message}
                  </p>
                  
                  <div className="flex items-center space-x-2 text-xs opacity-75">
                    <span>{formatTimeAgo(error.timestamp)}</span>
                    {error.code && (
                      <>
                        <span>•</span>
                        <span>Code: {error.code}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 閉じるボタン */}
                <button
                  onClick={() => onRemove(error.timestamp)}
                  className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 開発環境でのエラー詳細 */}
              {(import.meta as any).env?.DEV && error.details && (
                <details className="mt-2">
                  <summary className="text-xs cursor-pointer opacity-75 hover:opacity-100">
                    詳細 (開発環境)
                  </summary>
                  <pre className="mt-1 text-xs bg-black/30 p-2 rounded text-gray-300 overflow-auto max-h-20">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>

          {/* プログレスバー（自動削除までの時間） */}
          <div className="mt-3">
            <div className="w-full bg-gray-700/30 rounded-full h-1">
              <div 
                className="h-1 rounded-full bg-current animate-progress-shrink"
                style={{ 
                  animation: 'progress-shrink 10s linear forwards'
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* カスタムアニメーション */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes progress-shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-progress-shrink {
          animation: progress-shrink 10s linear forwards;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default ErrorToast;
