import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LazyImage from '../../components/LazyImage'

describe('LazyImage', () => {
  it('プレースホルダーが表示される', () => {
    render(
      <LazyImage 
        src="https://example.com/image.jpg" 
        alt="テスト画像" 
      />
    )
    
    // プレースホルダーのローディングアニメーションが表示される
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
  })

  it('IntersectionObserverが正しく設定される', () => {
    const mockObserve = vi.fn()
    const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
    
    global.IntersectionObserver = mockIntersectionObserver

    render(
      <LazyImage 
        src="https://example.com/image.jpg" 
        alt="テスト画像" 
      />
    )

    expect(mockIntersectionObserver).toHaveBeenCalled()
    expect(mockObserve).toHaveBeenCalled()
  })

  it('エラー時にエラーメッセージが表示される', () => {
    render(
      <LazyImage 
        src="invalid-url" 
        alt="テスト画像" 
      />
    )
    
    // エラー時の画像要素をシミュレート
    const img = screen.getByAltText('テスト画像')
    // エラーイベントを発火
    img.dispatchEvent(new Event('error'))
    
    expect(screen.getByText('画像を読み込めませんでした')).toBeInTheDocument()
  })
})