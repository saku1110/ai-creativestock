import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ErrorBoundary from '../../components/ErrorBoundary'

// エラーを投げるテストコンポーネント
const ThrowErrorComponent = () => {
  throw new Error('テストエラー')
}

// 正常なテストコンポーネント
const NormalComponent = () => <div>正常なコンポーネント</div>

describe('ErrorBoundary', () => {
  // コンソールエラーを一時的に無効化
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it('エラーが発生していない時は子コンポーネントを表示する', () => {
    render(
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument()
  })

  it('エラーが発生した時はエラーUIを表示する', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('申し訳ございません')).toBeInTheDocument()
    expect(screen.getByText('予期しないエラーが発生しました。')).toBeInTheDocument()
  })

  it('カスタムフォールバックUIが提供された場合はそれを表示する', () => {
    const customFallback = <div>カスタムエラー画面</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('カスタムエラー画面')).toBeInTheDocument()
  })

  it('エラーハンドラーが呼び出される', () => {
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('再試行ボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('再試行')).toBeInTheDocument()
  })

  it('ホームボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('ホーム')).toBeInTheDocument()
  })

  it('再読み込みボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('再読み込み')).toBeInTheDocument()
  })

  it('サポート連絡ボタンが表示される', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('サポートに連絡')).toBeInTheDocument()
  })

  it('ChunkLoadErrorを適切にカテゴライズする', () => {
    const ChunkErrorComponent = () => {
      throw new Error('ChunkLoadError: Loading chunk failed')
    }

    render(
      <ErrorBoundary>
        <ChunkErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('ネットワークエラー')).toBeInTheDocument()
  })

  it('NetworkErrorを適切にカテゴライズする', () => {
    const NetworkErrorComponent = () => {
      throw new Error('Network request failed')
    }

    render(
      <ErrorBoundary>
        <NetworkErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('ネットワークエラー')).toBeInTheDocument()
  })

  it('TypeErrorを適切にカテゴライズする', () => {
    const TypeErrorComponent = () => {
      throw new TypeError('Cannot read property of undefined')
    }

    render(
      <ErrorBoundary>
        <TypeErrorComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('データエラー')).toBeInTheDocument()
  })
})