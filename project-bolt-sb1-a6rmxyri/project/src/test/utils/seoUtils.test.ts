import { describe, it, expect } from 'vitest'
import { 
  getCategorySEO, 
  generateVideoSEOTitle, 
  generateVideoSEODescription,
  generateBreadcrumbs,
  getPageType
} from '../../utils/seoUtils'

describe('seoUtils', () => {
  describe('getCategorySEO', () => {
    it('有効なカテゴリのSEOデータを取得できる', () => {
      const beautySEO = getCategorySEO('beauty')
      expect(beautySEO).toBeDefined()
      expect(beautySEO?.title).toBe('美容・スキンケア動画素材')
      expect(beautySEO?.keywords).toContain('美容動画')
    })

    it('無効なカテゴリでnullを返す', () => {
      const invalidSEO = getCategorySEO('invalid-category')
      expect(invalidSEO).toBeNull()
    })
  })

  describe('generateVideoSEOTitle', () => {
    it('動画タイトルからSEOタイトルを生成する', () => {
      const title = generateVideoSEOTitle('美容クリーム広告', 'beauty')
      expect(title).toBe('美容クリーム広告 - 美容素材 | AI Creative Stock')
    })

    it('無効なカテゴリでも動作する', () => {
      const title = generateVideoSEOTitle('テスト動画', 'invalid')
      expect(title).toBe('テスト動画 - AI動画素材 | AI Creative Stock')
    })
  })

  describe('generateVideoSEODescription', () => {
    it('動画説明文からSEO説明文を生成する', () => {
      const description = generateVideoSEODescription(
        '美容クリーム広告',
        'これは高級美容クリームの魅力的な広告動画です。'.repeat(5), // 長い説明文
        'beauty',
        ['美容', 'クリーム', 'スキンケア', 'アンチエイジング']
      )
      
      expect(description).toContain('美容クリーム広告')
      expect(description).toContain('美容・スキンケア動画素材')
      expect(description).toContain('#美容・クリーム・スキンケア')
      expect(description.length).toBeLessThan(200) // 適切な長さに制限
    })

    it('タグなしでも動作する', () => {
      const description = generateVideoSEODescription(
        'ビジネス動画',
        'プロフェッショナルなビジネス動画です。',
        'business',
        []
      )
      
      expect(description).toContain('ビジネス動画')
      expect(description).not.toContain('#')
    })
  })

  describe('generateBreadcrumbs', () => {
    it('ルートパスでホームのみ返す', () => {
      const breadcrumbs = generateBreadcrumbs('/')
      expect(breadcrumbs).toHaveLength(1)
      expect(breadcrumbs[0]).toEqual({
        name: 'ホーム',
        url: '/'
      })
    })

    it('複数階層のパスで正しいパンくずを生成する', () => {
      const breadcrumbs = generateBreadcrumbs('/category/beauty')
      expect(breadcrumbs).toHaveLength(3)
      expect(breadcrumbs[0]).toEqual({
        name: 'ホーム',
        url: '/'
      })
      expect(breadcrumbs[1]).toEqual({
        name: 'Category',
        url: '/category'
      })
      expect(breadcrumbs[2]).toEqual({
        name: 'Beauty',
        url: '/category/beauty'
      })
    })

    it('既知のページタイプで適切な名前を生成する', () => {
      const breadcrumbs = generateBreadcrumbs('/dashboard')
      expect(breadcrumbs).toHaveLength(2)
      expect(breadcrumbs[1].name).toBe('AI動画素材ダッシュボード')
    })
  })

  describe('getPageType', () => {
    it('有効なページタイプを返す', () => {
      expect(getPageType('dashboard')).toBe('dashboard')
      expect(getPageType('pricing')).toBe('pricing')
      expect(getPageType('favorites')).toBe('favorites')
    })

    it('無効なページタイプでnullを返す', () => {
      expect(getPageType('invalid-page')).toBeNull()
    })

    it('空文字列でdashboardを返す', () => {
      expect(getPageType('')).toBe('dashboard')
    })
  })
})