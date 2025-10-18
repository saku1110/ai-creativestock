import React, { useState } from 'react';
import { Upload, Video, Image, Tag, Save, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { database } from '../lib/supabase';
import { useUser } from '../hooks/useUser';
import { useAdmin } from '../hooks/useAdmin';
import { useCSRF } from '../hooks/useCSRF';
import { withRateLimit, uploadRateLimiter, getUserIdentifier } from '../lib/rateLimiter';
import { auditLogger, createAuditContext } from '../lib/auditLogger';
import { globalErrorHandler, AppError, ErrorType, ErrorLevel, handleAsyncError } from '../lib/errorHandler';
import type { BeautySubCategory } from '../utils/categoryInference';

const AdminUpload: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // ウォーターマーク機能は削除しました
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'beauty' as 'beauty' | 'fitness' | 'haircare' | 'business' | 'lifestyle',
    beautySubCategory: 'skincare' as BeautySubCategory,
    tags: '',
    duration: 10,
    resolution: '1920x1080'
  });

  const { user } = useUser();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { csrfToken, isLoading: csrfLoading, refreshToken } = useCSRF();

  const categories = [
    { id: 'beauty', name: '美容' },
    { id: 'fitness', name: 'フィットネス' },
    { id: 'haircare', name: 'ヘアケア' },
    { id: 'business', name: 'ビジネス' },
    { id: 'lifestyle', name: 'ライフスタイル' }
  ];

  const beautySubCategories: Array<{ id: BeautySubCategory; name: string }> = [
    { id: 'skincare', name: 'スキンケア' },
    { id: 'haircare', name: 'ヘアケア' },
    { id: 'oralcare', name: 'オーラルケア' }
  ];

  const BEAUTY_SUBCATEGORY_META: Record<BeautySubCategory, { label: string; tag: string }> = {
    skincare: { label: 'スキンケア', tag: 'beauty:skincare' },
    haircare: { label: 'ヘアケア', tag: 'beauty:haircare' },
    oralcare: { label: 'オーラルケア', tag: 'beauty:oralcare' }
  };

  // ファイル検証関数
const validateFile = (file: File, type: 'video' | 'image'): string[] => {
    const errors: string[] = [];
    
    // ファイルサイズ制限
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    
    if (type === 'video') {
      if (file.size > maxVideoSize) {
        errors.push('動画ファイルは100MB以下である必要があります');
      }
      
      // 許可されたビデオMIMEタイプ
      const allowedVideoTypes = [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/quicktime'
      ];
      
      if (!allowedVideoTypes.includes(file.type)) {
        errors.push('サポートされていない動画形式です（MP4, WebM, OGG, MOVのみ）');
      }
    } else {
      if (file.size > maxImageSize) {
        errors.push('画像ファイルは10MB以下である必要があります');
      }
      
      // 許可された画像MIMEタイプ
      const allowedImageTypes = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];
      
      if (!allowedImageTypes.includes(file.type)) {
        errors.push('サポートされていない画像形式です（JPEG, PNG, WebPのみ）');
      }
    }
    
    return errors;
  };

  // 入力値のサニタイゼーション
  const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // スクリプトタグを除去
    .replace(/[<>]/g, ''); // HTMLタグを除去
};

const extractTagsFromFilename = (fileName: string): string[] => {
  if (!fileName) return [];

  const baseName = fileName.replace(/\.[^.]+$/, '');
  const rawTokens = baseName.split(/[_\-\s]+/);
  const uniqueTags: string[] = [];
  const seen = new Set<string>();

  rawTokens.forEach((token) => {
    const cleaned = sanitizeInput(token).replace(/^#/, '').trim();
    if (!cleaned) return;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    uniqueTags.push(cleaned);
  });

  return uniqueTags;
};

const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
      // ファイル検証
      const errors = validateFile(file, 'video');
      if (errors.length > 0) {
        setValidationErrors(errors);
        
        // 監査ログ：ファイル検証失敗
        const context = await createAuditContext(user?.id, {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          validation_errors: errors
        });
        auditLogger.logFileEvent('file_validation_failed', context, undefined, {
          file_name: file.name,
          errors
        });
        
        return;
      }
      
      setValidationErrors([]);
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);

      const autoTags = extractTagsFromFilename(file.name);
      if (autoTags.length > 0) {
        setFormData(prev => ({
          ...prev,
          tags: autoTags.join(', ')
        }));
      }

      // ファイル名からカテゴリを自動推定（先頭トークンの一致）
      try {
        const token = file.name.split(/[\-_]/)[0]?.toLowerCase();
        const validIds = categories.map(c => c.id);
        if (token && validIds.includes(token as any)) {
          setFormData(prev => ({ ...prev, category: token as any }));
        }
      } catch {
        // ignore
      }
      
      // 動画の長さ取得 + サムネイル自動生成（0.5秒地点で切り出し）
      try {
        const blob: Blob = await new Promise((resolve, reject) => {
          const v = document.createElement('video');
          v.src = url;
          v.preload = 'auto';
          v.muted = true;
          (v as any).playsInline = true;
          const onMeta = () => {
            const dur = v.duration || 0;
            setFormData(prev => ({ ...prev, duration: Math.max(1, Math.round(dur || prev.duration)) }));
            // 0.5秒地点（動画が0.5秒未満の場合は動画長の中間点）
            const target = dur > 0.5 ? 0.5 : Math.max(0, (dur || 0) * 0.5);
            const onSeeked = () => {
              try {
                const w = v.videoWidth || 480;
                const h = v.videoHeight || 270;
                const c = document.createElement('canvas');
                c.width = w; c.height = h;
                const ctx = c.getContext('2d');
                if (!ctx) throw new Error('Canvas not supported');
                ctx.drawImage(v, 0, 0, w, h);
                c.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create thumbnail'))), 'image/jpeg', 0.85);
              } catch (e) {
                reject(e as any);
              }
            };
            v.addEventListener('seeked', onSeeked, { once: true });
            v.currentTime = target;
          };
          v.addEventListener('loadedmetadata', onMeta, { once: true });
          v.addEventListener('error', () => reject(new Error('Failed to load video for thumbnail')), { once: true });
        });
        const thumbFile = new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
        setThumbnailFile(thumbFile);
        setThumbnailPreview(URL.createObjectURL(blob));
      } catch (err) {
        console.warn('自動サムネイル生成に失敗しました', err);
      }
    }
  };
  // サムネイルは動画のスタートフレームから自動生成するため、手動選択は廃止

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;

    if (name === 'category') {
      const nextCategory = sanitizedValue as 'beauty' | 'fitness' | 'haircare' | 'business' | 'lifestyle';
      setFormData(prev => ({
        ...prev,
        category: nextCategory,
        beautySubCategory: nextCategory === 'beauty'
          ? (prev.beautySubCategory || 'skincare')
          : prev.beautySubCategory
      }));
      return;
    }

    if (name === 'beautySubCategory') {
      setFormData(prev => ({
        ...prev,
        beautySubCategory: sanitizedValue as BeautySubCategory
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 管理者権限チェック
    if (!isAdmin || adminLoading) {
      alert('管理者権限が必要です');
      return;
    }
    
    if (!videoFile || !user) {
      alert('動画ファイルとログインが必要です');
      return;
    }

    // CSRFトークン確保（ローカル開発の初回送信で間に合わないケースを救済）
    let ensuredCsrf = csrfToken;
    if (csrfLoading || !ensuredCsrf) {
      ensuredCsrf = refreshToken();
    }
    if (!ensuredCsrf) {
      alert('セキュリティトークンが取得できません。ページを更新してください。');
      return;
    }

    // フォームデータ検証
    if (!formData.title.trim() || !formData.category) {
      alert('タイトルとカテゴリは必須です');
      return;
    }

    setIsUploading(true);
    setValidationErrors([]);

    try {
      // Dev向け: サーバレスAPI経由のアップロードを許可（Service Keyを使うためRLSに依存しない）
      if ((import.meta as any).env?.VITE_UPLOAD_VIA_API === 'true') {
        const fd = new FormData();
        fd.append('video', videoFile);
        fd.append('title', formData.title);
        fd.append('description', formData.description);
        fd.append('category', formData.category);
        if (formData.category === 'beauty' && formData.beautySubCategory) {
          fd.append('beautySubCategory', formData.beautySubCategory);
        }

        const resp = await fetch('/api/upload/auto', {
          method: 'POST',
          body: fd,
          headers: {
            'Authorization': `Bearer ${user.id}`,
            'X-API-Key': (import.meta as any).env?.VITE_UPLOAD_API_KEY || ''
          }
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({} as any));
          throw new Error(err.error || err.message || `Upload failed (${resp.status})`);
        }
        const result = await resp.json();

        setUploadSuccess(true);
        setFormData({
          title: '',
          description: '',
          category: 'beauty',
          beautySubCategory: 'skincare',
          tags: '',
          duration: 10,
          resolution: '1920x1080'
        });
        setVideoFile(null);
        setThumbnailFile(null);
        setVideoPreview('');
        setThumbnailPreview('');
        setTimeout(() => setUploadSuccess(false), 3000);
        return; // API経由の処理完了
      }

      // レート制限チェック
      const userIdentifier = getUserIdentifier(user.id);
      
      await withRateLimit(
        userIdentifier,
        async () => {
          // 監査ログ：アップロード開始
          const context = await createAuditContext(user.id, {
            file_name: videoFile.name,
            thumbnail_name: thumbnailFile?.name,
            video_title: formData.title,
            category: formData.category
          });
          auditLogger.logFileEvent('file_upload', context, undefined, {
            action: 'video_upload_started',
            file_size: videoFile.size,
            thumbnail_size: thumbnailFile?.size
          });

          // タグを配列に変換
          const baseTags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
          const tagSet = new Set<string>(baseTags);

          if (formData.category === 'beauty' && formData.beautySubCategory) {
            const beautyMeta = BEAUTY_SUBCATEGORY_META[formData.beautySubCategory];
            tagSet.add(beautyMeta.tag);
            tagSet.add(beautyMeta.label);
          }

          const tagsArray = Array.from(tagSet);
          
          // 動画をアップロード（カテゴリ別フォルダに保存）
          const { data: videoData, error: videoError } = await database.uploadVideo(videoFile, formData.category);
          if (videoError) throw videoError;

          // サムネイルをアップロード（カテゴリ別フォルダに保存）
          let ensuredThumb = thumbnailFile as File | null;
          if (!ensuredThumb) {
            // フォールバック生成（0.5秒地点で切り出し）
            const tempUrl = URL.createObjectURL(videoFile);
            const blob: Blob = await new Promise((resolve, reject) => {
              const v = document.createElement('video');
              v.src = tempUrl;
              v.preload = 'auto';
              v.muted = true;
              (v as any).playsInline = true;
              v.addEventListener('loadedmetadata', () => {
                const dur = v.duration || 0;
                const target = dur > 0.5 ? 0.5 : Math.max(0, (dur || 0) * 0.5);
                v.addEventListener('seeked', () => {
                  try {
                    const w = v.videoWidth || 480;
                    const h = v.videoHeight || 270;
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    const ctx = c.getContext('2d');
                    if (!ctx) return reject(new Error('Canvas not supported'));
                    ctx.drawImage(v, 0, 0, w, h);
                    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create thumbnail'))), 'image/jpeg', 0.85);
                  } catch (e) {
                    reject(e as any);
                  }
                }, { once: true });
                v.currentTime = target;
              }, { once: true });
              v.addEventListener('error', () => reject(new Error('Failed to load video for thumbnail')), { once: true });
            });
            ensuredThumb = new File([blob], `${videoFile.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
            setThumbnailFile(ensuredThumb);
            setThumbnailPreview(URL.createObjectURL(blob));
          }
          const { data: thumbnailData, error: thumbnailError } = await database.uploadThumbnail(ensuredThumb as File, formData.category);
          if (thumbnailError) throw thumbnailError;

          // 動画アセット情報を保存（CSRFトークンを含む）
          const { data: assetData, error: saveError } = await database.createVideoAsset({
            title: formData.title,
            description: formData.description,
            category: formData.category,
            tags: tagsArray,
            duration: formData.duration,
            resolution: formData.resolution,
            file_url: videoData.publicUrl,
            thumbnail_url: thumbnailData.publicUrl,
            is_featured: false,
            beauty_sub_category: formData.category === 'beauty' ? formData.beautySubCategory : null
          }, ensuredCsrf);

          if (saveError) throw saveError;

          // 監査ログ：アップロード成功
          auditLogger.logDatabaseEvent('create', 'video_assets', context, assetData?.id, {
            video_title: formData.title,
            category: formData.category,
            beauty_sub_category: formData.category === 'beauty' ? formData.beautySubCategory : null,
            tags: tagsArray,
            file_urls: {
              video: videoData.publicUrl,
              thumbnail: thumbnailData.publicUrl
            }
          });

          setUploadSuccess(true);
          
          // フォームをリセット
          setFormData({
            title: '',
            description: '',
            category: 'beauty',
            beautySubCategory: 'skincare',
            tags: '',
            duration: 10,
            resolution: '1920x1080'
          });
          setVideoFile(null);
          setThumbnailFile(null);
          setVideoPreview('');
          setThumbnailPreview('');
          
          setTimeout(() => setUploadSuccess(false), 3000);
        },
        uploadRateLimiter
      );

    } catch (error) {
      // 統一エラーハンドリング
      const appError = new AppError(
        error instanceof Error ? error.message : 'アップロードに失敗しました',
        ErrorType.FILE_UPLOAD,
        ErrorLevel.MEDIUM,
        'UPLOAD_FAILED',
        user?.id,
        {
          file_name: videoFile?.name,
          thumbnail_name: thumbnailFile?.name,
          operation: 'video_upload'
        }
      );
      
      await globalErrorHandler.handleError(appError);
    } finally {
      setIsUploading(false);
    }
  };

  const clearFiles = () => {
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPreview('');
    setThumbnailPreview('');
  };

  // 管理者権限チェック
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">権限を確認中...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">アクセス拒否</h2>
          <p className="text-gray-400 mb-6">
            この機能は管理者のみがアクセス可能です。<br />
            適切な権限を持っていない場合は、管理者にお問い合わせください。
          </p>
          <button
            onClick={() => window.history.back()}
            className="glass-effect border border-white/20 text-gray-300 hover:text-white py-3 px-6 rounded-xl transition-all font-bold"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
            <span className="gradient-text">動画アップロード</span>
          </h1>
          <p className="text-lg text-gray-400">
            新しい動画素材をライブラリに追加
          </p>
        </div>

        {/* エラーメッセージ */}
        {validationErrors.length > 0 && (
          <div className="glass-effect rounded-2xl p-6 border border-red-400/30 bg-red-400/10 mb-8">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-medium mb-2">入力エラー</h3>
                <ul className="text-red-300 text-sm space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 成功メッセージ */}
        {uploadSuccess && (
          <div className="glass-effect rounded-2xl p-6 border border-green-400/30 bg-green-400/10 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-medium">動画のアップロードが完了しました！</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('variant', 'dashboard');
                  window.location.href = url.toString();
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                ダッシュボードで確認
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* CSRFトークン（隠しフィールド） */}
          <input type="hidden" name="csrf_token" value={csrfToken} />
          {/* ファイルアップロード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 動画ファイル */}
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Video className="w-6 h-6 text-cyan-400" />
                <span>動画ファイル</span>
              </h3>
              
              {!videoFile ? (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-400/50 transition-colors">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">動画ファイルを選択</p>
                    <p className="text-gray-500 text-sm">MP4, MOV, AVI (最大100MB)</p>
                    <p className="text-gray-500 text-xs mt-3">
                      例) <span className="font-mono">タグ1_タグ2_タグ3.mp4</span> の形式でファイル名を付けるとタグを自動入力します
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <video
                    src={videoPreview}
                    controls
                    className="w-full rounded-xl"
                    style={{ maxHeight: '200px' }}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{videoFile.name}</span>
                    <button
                      type="button"
                      onClick={clearFiles}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* サムネイル（動画のスタートフレームから自動生成） */}
            <div className="glass-effect rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Image className="w-6 h-6 text-purple-400" />
                <span>サムネイル（自動生成）</span>
              </h3>
              <div className="space-y-4">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail"
                    className="w-full rounded-xl object-cover"
                    style={{ maxHeight: '200px' }}
                  />
                ) : (
                  <div className="text-gray-400 text-sm">動画選択後に自動生成されます</div>
                )}
                {thumbnailFile && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300 text-sm">{thumbnailFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnailFile(null);
                        setThumbnailPreview('');
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* メタデータ入力 */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Tag className="w-6 h-6 text-orange-400" />
              <span>動画情報</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* タイトル */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">タイトル</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  placeholder="動画のタイトル"
                  required
                />
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">カテゴリ</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                  required
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {formData.category === 'beauty' && (
                <div>
                  <label className="block text-gray-300 font-medium mb-2">美容サブカテゴリ</label>
                  <select
                    name="beautySubCategory"
                    value={formData.beautySubCategory}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {beautySubCategories.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 動画の長さ */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">動画の長さ（秒）</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                  min="1"
                  max="60"
                  required
                />
              </div>

              {/* 解像度 */}
              <div>
                <label className="block text-gray-300 font-medium mb-2">解像度</label>
                <select
                  name="resolution"
                  value={formData.resolution}
                  onChange={handleInputChange}
                  className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                  required
                >
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                </select>
              </div>
            </div>

            {/* 説明 */}
            <div className="mt-6">
              <label className="block text-gray-300 font-medium mb-2">説明</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 resize-none"
                placeholder="動画の内容について説明してください"
              />
            </div>

            {/* タグ */}
            <div className="mt-6">
              <label className="block text-gray-300 font-medium mb-2">
                タグ <span className="text-gray-500 text-sm">(カンマ区切り)</span>
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                placeholder="例: 女性, 20代, スリム, ナチュラル"
              />
              <p className="text-gray-500 text-sm mt-2">
                性別（男性、女性、男女）、年齢（10代、20代、30代...）、体型（スリム、標準、筋肉、ぽっちゃり）などを含めてください
              </p>
            </div>
            
            {/* ウォーターマーク設定 */}
            {/* ウォーターマーク機能は削除済み */}
          </div>

          {/* 送信ボタン */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className={`flex items-center space-x-2 px-8 py-4 rounded-xl font-bold transition-all ${
                isUploading || !videoFile
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'cyber-button text-white hover:scale-105'
              }`}
            >
              <Save className="w-5 h-5" />
              <span>
                {isUploading ? 'アップロード中...' : '動画をアップロード'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUpload;
