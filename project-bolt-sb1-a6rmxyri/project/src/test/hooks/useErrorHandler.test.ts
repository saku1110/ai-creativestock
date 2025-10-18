import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useErrorHandler } from '../../hooks/useErrorHandler'

describe('useErrorHandler', () => {
  it('エラーを追加できる', () => {
    const { result } = renderHook(() => useErrorHandler())

    act(() => {
      result.current.addError({
        message: 'テストエラー',
        type: 'client'
      })
    })

    expect(result.current.errors).toHaveLength(1)
    expect(result.current.errors[0].message).toBe('テストエラー')
    expect(result.current.errors[0].type).toBe('client')
  })

  it('エラーを削除できる', () => {
    const { result } = renderHook(() => useErrorHandler())

    let errorTimestamp: Date

    act(() => {
      const error = result.current.addError({
        message: 'テストエラー',
        type: 'client'
      })
      errorTimestamp = error.timestamp
    })

    expect(result.current.errors).toHaveLength(1)

    act(() => {
      result.current.removeError(errorTimestamp)
    })

    expect(result.current.errors).toHaveLength(0)
  })

  it('APIエラーを適切にカテゴライズする', () => {
    const { result } = renderHook(() => useErrorHandler())

    // ネットワークエラー
    act(() => {
      result.current.handleApiError({ 
        code: 'NETWORK_ERROR' 
      }, 'ネットワークテスト')
    })

    expect(result.current.errors[0].type).toBe('network')
    expect(result.current.errors[0].message).toContain('ネットワークエラー')

    // 認証エラー
    act(() => {
      result.current.handleApiError({ 
        status: 401 
      }, '認証テスト')
    })

    expect(result.current.errors[1].type).toBe('auth')
    expect(result.current.errors[1].message).toContain('認証エラー')

    // サーバーエラー
    act(() => {
      result.current.handleApiError({ 
        status: 500 
      }, 'サーバーテスト')
    })

    expect(result.current.errors[2].type).toBe('server')
    expect(result.current.errors[2].message).toContain('サーバーエラー')
  })

  it('Supabaseエラーを適切に処理する', () => {
    const { result } = renderHook(() => useErrorHandler())

    // アクセス権限エラー
    act(() => {
      result.current.handleSupabaseError({
        code: 'PGRST301',
        message: 'Forbidden'
      }, 'データベース操作')
    })

    expect(result.current.errors[0].type).toBe('auth')
    expect(result.current.errors[0].message).toContain('アクセス権限がありません')

    // データが見つからないエラー
    act(() => {
      result.current.handleSupabaseError({
        code: 'PGRST116',
        message: 'Not found'
      }, 'データ取得')
    })

    expect(result.current.errors[1].type).toBe('client')
    expect(result.current.errors[1].message).toContain('データが見つかりません')
  })

  it('Stripeエラーを適切に処理する', () => {
    const { result } = renderHook(() => useErrorHandler())

    // カードエラー
    act(() => {
      result.current.handleStripeError({
        type: 'card_error',
        message: 'Your card was declined.'
      })
    })

    expect(result.current.errors[0].type).toBe('client')
    expect(result.current.errors[0].message).toContain('カード情報に問題があります')

    // API接続エラー
    act(() => {
      result.current.handleStripeError({
        type: 'api_connection_error',
        message: 'Network connection error'
      })
    })

    expect(result.current.errors[1].type).toBe('network')
    expect(result.current.errors[1].message).toContain('決済サービスに接続できません')
  })

  it('エラーの重要度を正しく判定する', () => {
    const { result } = renderHook(() => useErrorHandler())

    const authError = {
      message: '認証エラー',
      type: 'auth' as const,
      timestamp: new Date()
    }

    const serverError = {
      message: 'サーバーエラー',
      type: 'server' as const,
      timestamp: new Date()
    }

    const validationError = {
      message: '入力エラー',
      type: 'validation' as const,
      timestamp: new Date()
    }

    expect(result.current.getErrorSeverity(authError)).toBe('high')
    expect(result.current.getErrorSeverity(serverError)).toBe('critical')
    expect(result.current.getErrorSeverity(validationError)).toBe('low')
  })

  it('すべてのエラーをクリアできる', () => {
    const { result } = renderHook(() => useErrorHandler())

    // 複数のエラーを追加
    act(() => {
      result.current.addError({ message: 'エラー1', type: 'client' })
      result.current.addError({ message: 'エラー2', type: 'server' })
      result.current.addError({ message: 'エラー3', type: 'network' })
    })

    expect(result.current.errors).toHaveLength(3)

    act(() => {
      result.current.clearErrors()
    })

    expect(result.current.errors).toHaveLength(0)
  })
})