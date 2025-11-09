import { createClient } from '@supabase/supabase-js'
import type { BeautySubCategory } from '../utils/categoryInference'

const runtimeEnv: Record<string, any> = (typeof import.meta !== 'undefined' && (import.meta as any).env)
  ? (import.meta as any).env
  : (process.env as Record<string, string | undefined>)

const normalizeBool = (value: any) => value === true || value === 'true'

const isDevFlag = runtimeEnv?.DEV ?? runtimeEnv?.NODE_ENV
const appEnv = runtimeEnv?.VITE_APP_ENV || runtimeEnv?.APP_ENV || runtimeEnv?.NODE_ENV
const useSampleFlag = runtimeEnv?.VITE_USE_SAMPLE_DATA || runtimeEnv?.USE_SAMPLE_DATA

const isDevMode = normalizeBool(isDevFlag) || appEnv === 'development'
const isSampleMode = isDevMode && normalizeBool(useSampleFlag)

const supabaseUrl = runtimeEnv?.VITE_SUPABASE_URL || runtimeEnv?.SUPABASE_URL
const supabaseAnonKey = runtimeEnv?.VITE_SUPABASE_ANON_KEY || runtimeEnv?.SUPABASE_ANON_KEY

// Simple in-memory auth shim for local/dev usage
let currentUser: any = null
const authListeners: Array<(event: string, session: any) => void> = []
const notifyAuth = (event: string) => {
  const session = currentUser ? { user: currentUser } : { user: null }
  authListeners.forEach((cb) => {
    try { cb(event, session) } catch {}
  })
}

// Very small stub of Supabase client used in dev/sample mode
const makeDevSupabase = () => {
  const devAuth = {
    async signInWithOAuth(_: any) {
      // Not used directly in our wrappers; kept for compatibility
      return { data: null, error: null }
    },
    async signOut() {
      currentUser = null
      notifyAuth('SIGNED_OUT')
      return { error: null }
    },
    async setSession(_: any) {
      // Accept and set whatever was provided; used only in OAuth callback path
      notifyAuth('TOKEN_REFRESHED')
      return { data: { user: currentUser }, error: null }
    },
    async getUser() {
      return { data: { user: currentUser }, error: null }
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.push(callback)
      return { data: { subscription: { unsubscribe: () => {
        const i = authListeners.indexOf(callback)
        if (i >= 0) authListeners.splice(i, 1)
      } } } }
    }
  }

  const chain = () => {
    const api: any = {}
    api.select = () => api
    api.insert = () => ({ data: null, error: new Error('Disabled in dev sample mode') })
    api.update = () => ({ data: null, error: new Error('Disabled in dev sample mode') })
    api.eq = () => api
    api.gte = () => api
    api.order = () => api
    api.limit = () => api
    api.single = () => ({ data: null, error: new Error('Disabled in dev sample mode') })
    return api
  }

  return {
    auth: devAuth,
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe() {} }) }) }),
    from: () => chain(),
    storage: {
      from: () => ({
        async upload() { return { data: null, error: new Error('Disabled in dev sample mode') } },
        async createSignedUrl() { return { data: { signedUrl: '' }, error: null } },
        getPublicUrl() { return { data: { publicUrl: '' } } },
        async move() { return { data: null, error: new Error('Disabled in dev sample mode') } },
        async remove() { return { data: null, error: new Error('Disabled in dev sample mode') } },
        async copy() { return { data: null, error: new Error('Disabled in dev sample mode') } }
      })
    },
    functions: {
      async invoke(name: string, { body }: { body?: any } = {}) {
        console.info(`[mock] supabase.functions.invoke(${name})`, body)
        return { data: { mock: true, body }, error: null }
      }
    }
  } as any
}

// Create actual or dev client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = isSampleMode
  ? makeDevSupabase()
  : (() => {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables')
      }
      return createClient(supabaseUrl, supabaseAnonKey)
    })()

// 認証関連のヘルパー関数
export const auth = {
  // Google認証（既存ユーザーログイン用）
  signInWithGoogle: async () => {
    if (isSampleMode) {
      // Simulate a successful Google login locally
      currentUser = {
        id: 'dev_google_123456',
        email: 'user@gmail.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: '開発ユーザー',
          name: '開発ユーザー',
          picture: 'https://lh3.googleusercontent.com/a/default-user=s96-c'
        }
      }
      notifyAuth('SIGNED_IN')
      return { data: { user: currentUser }, error: null }
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?mode=login` }
    })
    return { data, error }
  },

  // Google認証（新規ユーザー登録用）
  signUpWithGoogle: async () => {
    if (isSampleMode) {
      currentUser = {
        id: 'dev_google_new_987654',
        email: 'new.user@gmail.com',
        app_metadata: { provider: 'google' },
        user_metadata: {
          full_name: '開発ユーザー(新規)',
          name: '開発ユーザー(新規)'
        }
      }
      notifyAuth('SIGNED_IN')
      return { data: { user: currentUser }, error: null }
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?mode=registration` }
    })
    return { data, error }
  },


  // メール認証
  signInWithEmail: async (email: string, password: string) => {
    if (isSampleMode) {
      currentUser = {
        id: 'dev_email_123',
        email,
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: email.split('@')[0] }
      }
      notifyAuth('SIGNED_IN')
      return { data: { user: currentUser }, error: null }
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  },

  // メール登録
  signUpWithEmail: async (email: string, password: string) => {
    if (isSampleMode) {
      currentUser = {
        id: 'dev_email_new_456',
        email,
        app_metadata: { provider: 'email' },
        user_metadata: { full_name: email.split('@')[0] }
      }
      notifyAuth('SIGNED_IN')
      return { data: { user: currentUser }, error: null }
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  },

  // ログアウト
  signOut: async () => {
    if (isSampleMode) {
      currentUser = null
      notifyAuth('SIGNED_OUT')
      return { error: null }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // 現在のユーザー取得
  getCurrentUser: async () => {
    if (isSampleMode) {
      return { user: currentUser, error: null }
    }
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // 認証状態の変更を監視
  onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
    if (isSampleMode) {
      authListeners.push(callback)
      return { data: { subscription: { unsubscribe: () => {
        const i = authListeners.indexOf(callback)
        if (i >= 0) authListeners.splice(i, 1)
      } } } }
    }
    return supabase.auth.onAuthStateChange(callback)
  }
}

// データベース関連のヘルパー関数
export const database = {
  // ユーザープロフィール取得
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  // ユーザープロフィール更新
  updateUserProfile: async (userId: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // 動画アセット取得
  getVideoAssets: async (category?: string, limit = 100) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { data: null, error: new Error('Missing Supabase environment variables') }
    }

    const url = new URL(`${supabaseUrl}/rest/v1/video_assets`)
    url.searchParams.set('select', '*')
    url.searchParams.set('order', 'created_at.desc')
    url.searchParams.set('limit', String(limit))
    if (category) {
      url.searchParams.set('category', `eq.${category}`)
    }

    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    })

    if (!response.ok) {
      return { data: null, error: new Error(`Supabase REST error ${response.status}`) }
    }

    const data = await response.json()
    return { data, error: null }
  },

  // サブスクリプション情報取得
  getUserSubscription: async (userId: string) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  // ダウンロード履歴追加
  addDownloadHistory: async (userId: string, videoId: string) => {
    const { data, error } = await supabase
      .from('download_history')
      .insert([
        {
          user_id: userId,
          video_id: videoId,
          downloaded_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    return { data, error }
  },

  // 月間ダウンロード数取得
  getMonthlyDownloadCount: async (userId: string) => {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('download_history')
      .select('id')
      .eq('user_id', userId)
      .gte('downloaded_at', startOfMonth.toISOString())

    return { count: data?.length || 0, error }
  },

  // 動画ファイルアップロード
  uploadVideo: async (file: File, category?: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const safeCat = (category || 'uncategorized').toString().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    const filePath = `videos/${safeCat}/${fileName}`

    const { data, error } = await supabase.storage
      .from('video-assets')
      .upload(filePath, file)

    if (error) {
      return { data: null, error }
    }

    // Try signed URL first (works for private buckets), fallback to public URL
    const signed = await supabase.storage
      .from('video-assets')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days
    if (!signed.error && signed.data?.signedUrl) {
      return { data: { publicUrl: signed.data.signedUrl, path: filePath }, error: null }
    }
    const { data: { publicUrl } } = supabase.storage
      .from('video-assets')
      .getPublicUrl(filePath)
    return { data: { publicUrl, path: filePath }, error: null }
  },

  // サムネイルアップロード
  uploadThumbnail: async (file: File, category?: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const safeCat = (category || 'uncategorized').toString().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    const filePath = `thumbnails/${safeCat}/${fileName}`

    const { data, error } = await supabase.storage
      .from('video-assets')
      .upload(filePath, file)

    if (error) {
      return { data: null, error }
    }

    const signed = await supabase.storage
      .from('video-assets')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days
    if (!signed.error && signed.data?.signedUrl) {
      return { data: { publicUrl: signed.data.signedUrl, path: filePath }, error: null }
    }
    const { data: { publicUrl } } = supabase.storage
      .from('video-assets')
      .getPublicUrl(filePath)
    return { data: { publicUrl, path: filePath }, error: null }
  },

  // 動画アセット作成（CSRF保護付き）
  createVideoAsset: async (videoData: {
    title: string
    description: string
    category: string
    tags: string[]
    duration: number
    resolution: string
    file_url: string
    thumbnail_url: string
    is_featured: boolean
    beauty_sub_category?: BeautySubCategory | null
  }, csrfToken?: string) => {
    // CSRFトークンの検証（フロントエンドでの基本チェック）
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    if (isBrowser && !csrfToken) {
      return { data: null, error: new Error('CSRFトークンが必要です') }
    }

    const { data, error } = await supabase
      .from('video_assets')
      .insert([{
        ...videoData,
        download_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    return { data, error }
  },

  // 管理者チェック（データベースベース）
  checkAdminStatus: async (userId: string) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { isAdmin: false, error }
    }

    return { isAdmin: !!data, role: data?.role, permissions: data?.permissions, error: null }
  },

  // 管理者ユーザー追加（既存の管理者のみ実行可能）
  addAdminUser: async (userId: string, role = 'admin', permissions: string[] = []) => {
    const { data, error } = await supabase
      .from('admin_users')
      .insert([{
        user_id: userId,
        role,
        permissions
      }])
      .select()
      .single()

    return { data, error }
  },

  // ステージング動画の一覧取得
  getStagingVideos: async () => {
    if (isSampleMode) {
      return { data: [], error: null }
    }

    const { data, error } = await supabase
      .from('video_staging')
      .select('*')
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // ステージング動画のメタデータ更新
  updateStagingVideo: async (videoId: string, updates: Record<string, unknown>) => {
    if (isSampleMode) {
      return { data: null, error: new Error('ステージング操作はサンプルデータモードでは無効です') }
    }

    const payload = { ...updates }
    if (!Object.prototype.hasOwnProperty.call(payload, 'updated_at')) {
      payload.updated_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('video_staging')
      .update(payload)
      .eq('id', videoId)
      .select()
      .single()

    return { data, error }
  },

  // ステージング動画の承認処理
  approveStagingVideo: async (
    videoId: string,
    options: {
      reviewerId?: string
      title?: string
      description?: string
      category?: string
      tags?: string[]
      duration?: number
      resolution?: string
      beautySubCategory?: BeautySubCategory | null
    } = {}
  ) => {
    if (isSampleMode) {
      return { data: null, error: new Error('ステージング操作はサンプルデータモードでは無効です') }
    }

    const { data: staging, error: fetchError } = await supabase
      .from('video_staging')
      .select('*')
      .eq('id', videoId)
      .single()

    if (fetchError) {
      return { data: null, error: fetchError }
    }

    const title = options.title?.trim() || staging.title || 'Untitled Clip'
    const description = options.description ?? staging.description ?? ''
    const baseCategory = options.category || staging.category || 'uncategorized'
    const normalizedCategory = baseCategory
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')

    const tagSource = options.tags ?? staging.tags ?? []
    const normalizedTags = Array.isArray(tagSource)
      ? tagSource.filter(Boolean)
      : typeof tagSource === 'string'
        ? tagSource.split(',').map((tag) => tag.trim()).filter(Boolean)
        : []

    const sourcePath: string | undefined =
      staging.storage_path ||
      staging.staging_path ||
      staging.file_path ||
      staging.path ||
      (typeof staging.file_url === 'string' && staging.file_url.startsWith('video-assets/') ? staging.file_url : undefined)

    if (!sourcePath) {
      return { data: null, error: new Error('ステージング動画のストレージパスが見つかりませんでした') }
    }

    const fileExtMatch = sourcePath.match(/\.([a-zA-Z0-9]+)$/)
    const fileExt = fileExtMatch ? fileExtMatch[1].toLowerCase() : 'mp4'
    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const timestamp = Date.now()
    const targetFileName = `${slugBase || 'clip'}-${timestamp}.${fileExt}`
    const targetVideoPath = `videos/${normalizedCategory}/${targetFileName}`

    const moveResult = await supabase.storage
      .from('video-assets')
      .move(sourcePath, targetVideoPath)

    if (moveResult.error) {
      return { data: null, error: moveResult.error }
    }

    const signedVideo = await supabase.storage
      .from('video-assets')
      .createSignedUrl(targetVideoPath, 60 * 60 * 24 * 7)
    const finalVideoUrl = (!signedVideo.error && signedVideo.data?.signedUrl)
      ? signedVideo.data.signedUrl
      : supabase.storage.from('video-assets').getPublicUrl(targetVideoPath).data.publicUrl

    let finalThumbnailUrl: string | null = staging.thumbnail_url ?? null
    let finalThumbnailPath: string | null = staging.thumbnail_path ?? null

    if (staging.thumbnail_path) {
      const thumbMatch = staging.thumbnail_path.match(/\.([a-zA-Z0-9]+)$/)
      const thumbExt = thumbMatch ? thumbMatch[1].toLowerCase() : 'jpg'
      const targetThumbPath = `thumbnails/${normalizedCategory}/${slugBase || 'clip'}-${timestamp}.${thumbExt}`
      const moveThumb = await supabase.storage
        .from('video-assets')
        .move(staging.thumbnail_path, targetThumbPath)

      if (!moveThumb.error) {
        finalThumbnailPath = targetThumbPath
        const signedThumb = await supabase.storage
          .from('video-assets')
          .createSignedUrl(targetThumbPath, 60 * 60 * 24 * 7)
        finalThumbnailUrl = (!signedThumb.error && signedThumb.data?.signedUrl)
          ? signedThumb.data.signedUrl
          : supabase.storage.from('video-assets').getPublicUrl(targetThumbPath).data.publicUrl
      }
    }

    const now = new Date().toISOString()
    const beautySubCategory: BeautySubCategory | null =
      (options.category || staging.category) === 'beauty'
        ? (options.beautySubCategory ?? staging.beauty_sub_category ?? null)
        : null

    const { data: asset, error: assetError } = await supabase
      .from('video_assets')
      .insert([{
        title,
        description,
        category: baseCategory,
        tags: normalizedTags,
        duration: options.duration ?? staging.duration ?? 10,
        resolution: options.resolution ?? staging.resolution ?? '1920x1080',
        file_url: finalVideoUrl,
        thumbnail_url: finalThumbnailUrl,
        is_featured: false,
        download_count: staging.download_count || 0,
        created_at: now,
        updated_at: now,
        beauty_sub_category: beautySubCategory
      }])
      .select()
      .single()

    if (assetError) {
      return { data: null, error: assetError }
    }

    const stagingUpdate: Record<string, any> = {
      status: 'approved',
      approved_at: now,
      approved_by: options.reviewerId || null,
      production_video_id: asset?.id || null,
      production_path: targetVideoPath,
      thumbnail_path: finalThumbnailPath,
      thumbnail_url: finalThumbnailUrl,
      updated_at: now
    }

    const { data: updatedStaging, error: updateError } = await supabase
      .from('video_staging')
      .update(stagingUpdate)
      .eq('id', videoId)
      .select()
      .single()

    return { data: { staging: updatedStaging, asset }, error: updateError }
  },

  // ステージング動画の却下処理
  rejectStagingVideo: async (videoId: string, reason: string, reviewerId?: string) => {
    if (isSampleMode) {
      return { data: null, error: new Error('ステージング操作はサンプルデータモードでは無効です') }
    }

    const now = new Date().toISOString()
    const updatePayload: Record<string, any> = {
      status: 'rejected',
      rejection_reason: reason || null,
      reviewed_by: reviewerId || null,
      updated_at: now
    }

    const { data, error } = await supabase
      .from('video_staging')
      .update(updatePayload)
      .eq('id', videoId)
      .select()
      .single()

    return { data, error }
  }
}
