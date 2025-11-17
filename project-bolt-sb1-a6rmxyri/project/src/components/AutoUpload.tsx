import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  FolderOpen, 
  Video, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X,
  Zap,
  Brain,
  BarChart3,
  Tag,
  Clock,
  FileVideo
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { useUser } from '../hooks/useUser';
import { VideoProcessorClient } from '../lib/videoProcessorClient';

// アップロードアイテムの型定義
interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'analyzing' | 'uploading' | 'completed' | 'failed';
  progress: number;
  metadata?: {
    duration: number;
    resolution: string;
    frameRate: number;
    size: number;
  };
  classification?: {
    category: string;
    confidence: number;
    keywords: string[];
  };
  error?: string;
  result?: {
    id: string;
    urls: {
      video: string;
      thumbnail: string;
    };
  };
}

const AutoUpload: React.FC = () => {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useUser();

  // カテゴリマッピング
  const categoryLabels: Record<string, string> = {
    beauty: '美容',
    diet: 'ダイエット',
    business: 'ビジネス',
    lifestyle: 'ライフスタイル',
    romance: '恋愛',
    pet: 'ペット'
  };

  // ドラッグ&ドロップハンドラ
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('video/') || file.name.endsWith('.mp4')
    );

    if (files.length > 0) {
      addFilesToQueue(files);
    }
  }, []);

  // ファイル選択ハンドラ
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      addFilesToQueue(files);
    }
  };

  // ファイルをキューに追加
  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));

    setUploadItems(prev => [...prev, ...newItems]);
    
    // 自動的に処理を開始
    if (!isProcessing) {
      processQueue(newItems);
    }
  };

  // アップロードキューを処理
  const processQueue = async (items: UploadItem[]) => {
    setIsProcessing(true);

    for (const item of items) {
      await processFile(item);
    }

    setIsProcessing(false);
  };

  // 個別ファイルを処理
  const processFile = async (item: UploadItem) => {
    try {
      // 処理開始
      updateItemStatus(item.id, 'processing', 10);

      // クライアント側で基本検証
      const validation = VideoProcessorClient.validateVideoClient(item.file);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // メタデータ抽出をシミュレート（実際にはサーバー側で処理）
      updateItemStatus(item.id, 'analyzing', 30);
      
      // クライアント側で動画情報を取得
      try {
        const videoInfo = await VideoProcessorClient.getVideoInfoClient(item.file);
        console.log('Video info:', videoInfo);
      } catch (error) {
        console.warn('Failed to get video info on client:', error);
      }

      // サーバーにアップロード
      updateItemStatus(item.id, 'uploading', 50);
      
      const formData = new FormData();
      formData.append('video', item.file);
      
      const response = await fetch('/api/upload/auto', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${user?.id}`,
          // Serverless upload endpoint requires X-API-Key
          // Expose non-secret client var mapped to the same value in vercel.json
          'X-API-Key': (import.meta as any).env?.VITE_UPLOAD_API_KEY || ''
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({} as any));
        throw new Error(error.error || error.message || `Upload failed (${response.status})`);
      }

      const result = await response.json();

      // 結果を更新
      setUploadItems(prev => prev.map(i => 
        i.id === item.id 
          ? {
              ...i,
              status: 'completed',
              progress: 100,
              metadata: result.data.metadata,
              classification: result.data.classification,
              result: {
                id: result.data.id,
                urls: result.data.urls
              }
            }
          : i
      ));

    } catch (error) {
      console.error('Processing error:', error);
      setUploadItems(prev => prev.map(i => 
        i.id === item.id 
          ? {
              ...i,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : i
      ));
    }
  };

  // アイテムのステータスを更新
  const updateItemStatus = (id: string, status: UploadItem['status'], progress: number) => {
    setUploadItems(prev => prev.map(item => 
      item.id === id ? { ...item, status, progress } : item
    ));
  };

  // アイテムを削除
  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  // 失敗したアイテムを再試行
  const retryItem = async (id: string) => {
    const item = uploadItems.find(i => i.id === id);
    if (item) {
      setUploadItems(prev => prev.map(i => 
        i.id === id ? { ...i, status: 'pending', progress: 0, error: undefined } : i
      ));
      await processFile(item);
    }
  };

  // 管理者権限チェック
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">アクセス拒否</h2>
          <p className="text-gray-400">この機能は管理者のみがアクセス可能です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
            <span className="gradient-text flex items-center space-x-3">
              <Zap className="w-10 h-10" />
              <span>自動アップロードシステム</span>
            </span>
          </h1>
          <p className="text-lg text-gray-400">
            AIが動画を自動分析・カテゴリ分類して一括アップロード
          </p>
        </div>

        {/* 機能説明 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-effect rounded-xl p-6 border border-cyan-500/20">
            <Brain className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">AI自動分類</h3>
            <p className="text-gray-400 text-sm">
              動画内容を分析して適切なカテゴリに自動分類
            </p>
          </div>
          
          <div className="glass-effect rounded-xl p-6 border border-purple-500/20">
            <BarChart3 className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">メタデータ抽出</h3>
            <p className="text-gray-400 text-sm">
              解像度、長さ、フレームレートを自動取得
            </p>
          </div>
          
          <div className="glass-effect rounded-xl p-6 border border-orange-500/20">
            <Tag className="w-8 h-8 text-orange-400 mb-3" />
            <h3 className="text-lg font-bold mb-2">タグ自動生成</h3>
            <p className="text-gray-400 text-sm">
              動画の特徴から関連タグを自動生成
            </p>
          </div>
        </div>

        {/* ドロップゾーン */}
        <div
          className={`glass-effect rounded-2xl p-8 border-2 border-dashed transition-all ${
            isDragging 
              ? 'border-cyan-400 bg-cyan-400/10' 
              : 'border-white/20 hover:border-cyan-400/50'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              動画ファイルをドロップ
            </h3>
            <p className="text-gray-400 mb-4">
              またはクリックして選択（複数可）
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="cyber-button px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              <FolderOpen className="w-5 h-5 inline mr-2" />
              ファイルを選択
            </button>
            <p className="text-gray-500 text-sm mt-4">
              対応形式: MP4 (10秒, 最大100MB)
            </p>
          </div>
        </div>

        {/* アップロードリスト */}
        {uploadItems.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">
              アップロードキュー ({uploadItems.length}件)
            </h3>
            
            {uploadItems.map(item => (
              <div 
                key={item.id}
                className="glass-effect rounded-xl p-6 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <FileVideo className="w-6 h-6 text-cyan-400" />
                      <h4 className="font-medium text-white">
                        {item.file.name}
                      </h4>
                      {item.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {item.status === 'failed' && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      {['processing', 'analyzing', 'uploading'].includes(item.status) && (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      )}
                    </div>

                    {/* ステータス表示 */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-400">
                          {item.status === 'pending' && '待機中'}
                          {item.status === 'processing' && 'ファイル検証中...'}
                          {item.status === 'analyzing' && 'AI分析中...'}
                          {item.status === 'uploading' && 'アップロード中...'}
                          {item.status === 'completed' && '完了'}
                          {item.status === 'failed' && 'エラー'}
                        </span>
                        <span className="text-sm text-gray-400">
                          {item.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            item.status === 'failed' ? 'bg-red-500' :
                            item.status === 'completed' ? 'bg-green-500' :
                            'bg-cyan-500'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* 分類結果 */}
                    {item.classification && (
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-400">カテゴリ: </span>
                          <span className="text-sm text-white">
                            {categoryLabels[item.classification.category]}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({(item.classification.confidence * 100).toFixed(1)}%)
                          </span>
                        </div>
                        {item.metadata && (
                          <div>
                            <span className="text-sm text-gray-400">解像度: </span>
                            <span className="text-sm text-white">
                              {item.metadata.resolution}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* エラーメッセージ */}
                    {item.error && (
                      <div className="text-sm text-red-400 mb-3">
                        エラー: {item.error}
                      </div>
                    )}

                    {/* キーワード */}
                    {item.classification?.keywords && item.classification.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {item.classification.keywords.slice(0, 5).map((keyword, idx) => (
                          <span 
                            key={idx}
                            className="text-xs px-2 py-1 bg-white/10 rounded-full text-gray-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* アクション */}
                  <div className="ml-4">
                    {item.status === 'failed' ? (
                      <button
                        onClick={() => retryItem(item.id)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        title="再試行"
                      >
                        <Loader2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                        title="削除"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {uploadItems.length > 0 && (
          <div className="mt-8 glass-effect rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-bold mb-4">アップロード統計</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-400">合計</span>
                <p className="text-2xl font-bold text-white">{uploadItems.length}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">完了</span>
                <p className="text-2xl font-bold text-green-400">
                  {uploadItems.filter(i => i.status === 'completed').length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-400">処理中</span>
                <p className="text-2xl font-bold text-cyan-400">
                  {uploadItems.filter(i => ['processing', 'analyzing', 'uploading'].includes(i.status)).length}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-400">エラー</span>
                <p className="text-2xl font-bold text-red-400">
                  {uploadItems.filter(i => i.status === 'failed').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoUpload;
