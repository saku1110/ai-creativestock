import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OptimizedVideoCard from '../../components/OptimizedVideoCard'

const mockVideo = {
  id: 'test-video-1',
  title: 'テスト美容動画',
  description: 'これはテスト用の美容動画です',
  category: 'beauty' as const,
  tags: ['美容', 'クリーム', 'スキンケア'],
  duration: 10,
  resolution: '1080p',
  file_url: 'https://example.com/video.mp4',
  thumbnail_url: 'https://example.com/thumb.jpg',
  is_featured: true,
  download_count: 150,
  created_at: '2024-01-01T00:00:00Z'
}

const defaultProps = {
  video: mockVideo,
  viewMode: 'grid' as const,
  isFavorited: false,
  canDownload: true,
  onDownload: vi.fn(),
  onPreview: vi.fn(),
  onToggleFavorite: vi.fn()
}

describe('OptimizedVideoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('動画情報が正しく表示される', () => {
    render(<OptimizedVideoCard {...defaultProps} />)

    expect(screen.getByText('テスト美容動画')).toBeInTheDocument()
    expect(screen.getByText('美容')).toBeInTheDocument()
    expect(screen.getByText('1080p')).toBeInTheDocument()
    expect(screen.getByText('150回DL')).toBeInTheDocument()
    expect(screen.getByText('10秒')).toBeInTheDocument()
  })

  it('注目バッジが表示される', () => {
    render(<OptimizedVideoCard {...defaultProps} />)
    expect(screen.getByText('★注目')).toBeInTheDocument()
  })

  it('注目動画でない場合はバッジが表示されない', () => {
    const nonFeaturedVideo = { ...mockVideo, is_featured: false }
    render(
      <OptimizedVideoCard 
        {...defaultProps} 
        video={nonFeaturedVideo} 
      />
    )
    expect(screen.queryByText('★注目')).not.toBeInTheDocument()
  })

  it('ダウンロードボタンが動作する', () => {
    render(<OptimizedVideoCard {...defaultProps} />)
    
    const downloadButton = screen.getByText('ダウンロード').closest('button')
    fireEvent.click(downloadButton!)

    expect(defaultProps.onDownload).toHaveBeenCalledWith(mockVideo)
  })

  it('ダウンロード不可の場合はボタンが無効化される', () => {
    render(
      <OptimizedVideoCard 
        {...defaultProps} 
        canDownload={false} 
      />
    )
    
    const downloadButton = screen.getByText('ダウンロード').closest('button')
    expect(downloadButton).toBeDisabled()
  })

  it('お気に入りボタンが動作する', () => {
    render(<OptimizedVideoCard {...defaultProps} />)
    
    const favoriteButton = screen.getByRole('button', { name: /heart/i })
    fireEvent.click(favoriteButton)

    expect(defaultProps.onToggleFavorite).toHaveBeenCalledWith(mockVideo.id)
  })

  it('お気に入り状態が正しく表示される', () => {
    render(
      <OptimizedVideoCard 
        {...defaultProps} 
        isFavorited={true} 
      />
    )
    
    const favoriteButton = screen.getByRole('button', { name: /heart/i })
    expect(favoriteButton).toHaveClass('bg-pink-400/20')
  })

  it('プレビューボタンが動作する', () => {
    render(<OptimizedVideoCard {...defaultProps} />)
    
    const previewButton = screen.getByRole('button', { name: /eye/i })
    fireEvent.click(previewButton)

    expect(defaultProps.onPreview).toHaveBeenCalledWith(mockVideo)
  })

  describe('カテゴリカラー', () => {
    it('美容カテゴリで正しい色が適用される', () => {
      render(<OptimizedVideoCard {...defaultProps} />)
      
      const categoryBadge = screen.getByText('美容')
      expect(categoryBadge).toHaveClass('bg-pink-500/20', 'text-pink-400')
    })

    it('フィットネスカテゴリで正しい色が適用される', () => {
      const fitnessVideo = { ...mockVideo, category: 'fitness' as const }
      render(
        <OptimizedVideoCard 
          {...defaultProps} 
          video={fitnessVideo} 
        />
      )
      
      const categoryBadge = screen.getByText('フィットネス')
      expect(categoryBadge).toHaveClass('bg-green-500/20', 'text-green-400')
    })
  })

  describe('表示モード', () => {
    it('グリッドモードで正しいレイアウトが適用される', () => {
      const { container } = render(
        <OptimizedVideoCard 
          {...defaultProps} 
          viewMode="grid" 
        />
      )
      
      // グリッドモード特有のクラスが適用されているか確認
      expect(container.querySelector('.aspect-\\[9\\/16\\]')).toBeInTheDocument()
    })

    it('リストモードで正しいレイアウトが適用される', () => {
      const { container } = render(
        <OptimizedVideoCard 
          {...defaultProps} 
          viewMode="list" 
        />
      )
      
      // リストモード特有のクラスが適用されているか確認
      expect(container.querySelector('.flex.items-center')).toBeInTheDocument()
    })

    it('リストモードで説明文が表示される', () => {
      render(
        <OptimizedVideoCard 
          {...defaultProps} 
          viewMode="list" 
        />
      )
      
      expect(screen.getByText('これはテスト用の美容動画です')).toBeInTheDocument()
    })

    it('グリッドモードで説明文が表示されない', () => {
      render(
        <OptimizedVideoCard 
          {...defaultProps} 
          viewMode="grid" 
        />
      )
      
      expect(screen.queryByText('これはテスト用の美容動画です')).not.toBeInTheDocument()
    })
  })

  it('動画時間が正しくフォーマットされる', () => {
    const longVideo = { ...mockVideo, duration: 125 } // 2分5秒
    render(
      <OptimizedVideoCard 
        {...defaultProps} 
        video={longVideo} 
      />
    )
    
    expect(screen.getByText('125秒')).toBeInTheDocument()
  })

  it('LazyImageコンポーネントが使用される', () => {
    render(<OptimizedVideoCard {...defaultProps} />)
    
    // LazyImage内の画像要素を確認
    const img = screen.getByAltText('テスト美容動画')
    expect(img).toBeInTheDocument()
  })
})