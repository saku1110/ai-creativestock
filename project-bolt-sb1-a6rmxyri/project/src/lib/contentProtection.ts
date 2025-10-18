// コンテンツ保護システム
import { supabase } from './supabase';

/**
 * 右クリック禁止とコンテキストメニューブロック
 */
export class ContentProtection {
  private static isProtectionEnabled = true;
  private static debugModeDetected = false;
  private static devToolsOpen = false;

  /**
   * コンテンツ保護を初期化
   */
  static initialize() {
    this.blockContextMenu();
    this.blockKeyboardShortcuts();
    this.blockTextSelection();
    this.blockDragAndDrop();
    this.detectDevTools();
    this.preventConsoleAccess();
  }

  /**
   * 右クリック・コンテキストメニューをブロック
   */
  private static blockContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 警告メッセージを表示
      this.showProtectionWarning('右クリックは無効化されています。');
      
      return false;
    }, { capture: true });
  }

  /**
   * 開発者ツール関連のキーボードショートカットをブロック
   */
  private static blockKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12キー
      if (e.key === 'F12') {
        e.preventDefault();
        this.showProtectionWarning('開発者ツールのアクセスは制限されています。');
        return false;
      }

      // Ctrl+Shift+I (開発者ツール)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        this.showProtectionWarning('開発者ツールのアクセスは制限されています。');
        return false;
      }

      // Ctrl+Shift+J (コンソール)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        this.showProtectionWarning('コンソールへのアクセスは制限されています。');
        return false;
      }

      // Ctrl+Shift+C (要素選択)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.showProtectionWarning('要素検査は制限されています。');
        return false;
      }

      // Ctrl+U (ソース表示)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        this.showProtectionWarning('ソースコードの表示は制限されています。');
        return false;
      }

      // Ctrl+S (保存)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.showProtectionWarning('ページの保存は制限されています。');
        return false;
      }

      // Ctrl+A (全選択)
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        this.showProtectionWarning('全選択は制限されています。');
        return false;
      }

      // Ctrl+C (コピー)
      if (e.ctrlKey && e.key === 'c') {
        e.preventDefault();
        this.showProtectionWarning('コピーは制限されています。');
        return false;
      }

      // Ctrl+V (貼り付け)
      if (e.ctrlKey && e.key === 'v') {
        e.preventDefault();
        return false;
      }

      // Ctrl+X (切り取り)
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        this.showProtectionWarning('切り取りは制限されています。');
        return false;
      }
    }, { capture: true });
  }

  /**
   * テキスト選択をブロック
   */
  private static blockTextSelection() {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    }, { capture: true });

    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, { capture: true });

    // CSSでも選択を無効化
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      input, textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * ドラッグ&ドロップをブロック
   */
  private static blockDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, { capture: true });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, { capture: true });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, { capture: true });
  }

  /**
   * 開発者ツールの検出
   */
  private static detectDevTools() {
    // より厳密な開発者ツール検出
    let devtools = {
      open: false,
      orientation: null as string | null
    };

    const threshold = 160;
    let detectionCount = 0;
    const maxDetectionCount = 3; // 3回連続で検出された場合のみ開発者モードと判定

    const checkDevTools = () => {
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      
      // より厳密な判定条件
      const isDevToolsOpen = (heightThreshold || widthThreshold) && 
                            (window.outerHeight < window.screen.height * 0.8 || 
                             window.outerWidth < window.screen.width * 0.8);
      
      if (isDevToolsOpen) {
        detectionCount++;
        if (detectionCount >= maxDetectionCount && !devtools.open) {
          devtools.open = true;
          devtools.orientation = widthThreshold ? 'vertical' : 'horizontal';
          this.onDevToolsOpen();
        }
      } else {
        detectionCount = Math.max(0, detectionCount - 1);
        if (devtools.open && detectionCount === 0) {
          devtools.open = false;
          devtools.orientation = null;
          this.onDevToolsClose();
        }
      }
    };

    // より長い間隔でチェック
    setInterval(checkDevTools, 1000);

    // F12キーやCtrl+Shift+Iなどの直接的なキー操作の検出
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        this.onDevToolsOpen();
      }
    });

    // デバッグ文字列の検出（より控えめに）
    let debugDetectionCount = 0;
    let element = document.createElement('div');
    element.id = 'devtools-detector';
    Object.defineProperty(element, 'id', {
      get: () => {
        debugDetectionCount++;
        if (debugDetectionCount > 5) { // 5回以上アクセスされた場合のみ
          this.onDevToolsOpen();
        }
        return 'devtools-detector';
      }
    });

    // コンソールログの検出を無効化（誤検出を防ぐため）
    // const originalLog = console.log;
    // console.log = (...args) => {
    //   this.debugModeDetected = true;
    //   this.onDevToolsOpen();
    //   originalLog.apply(console, args);
    // };

    // 定期的なコンソールチェックも無効化
    // setInterval(() => {
    //   console.clear();
    //   console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
    //   console.log('%cこのページのコンテンツは保護されています。', 'color: red; font-size: 16px;');
    //   console.log('%c不正アクセスは監視されています。', 'color: red; font-size: 16px;');
    // }, 1000);
  }

  /**
   * 開発者ツールが開かれた時の処理
   */
  private static onDevToolsOpen() {
    this.devToolsOpen = true;
    this.debugModeDetected = true;
    
    // ウォーターマークを動的に追加
    this.addWatermarkToVideos();
    
    // 警告を表示
    this.showProtectionWarning('開発者ツールが検出されました。コンテンツは保護されています。');
    
    // 使用状況をログに記録
    this.logSecurityEvent('devtools_detected', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  }

  /**
   * 開発者ツールが閉じられた時の処理
   */
  private static onDevToolsClose() {
    this.devToolsOpen = false;
    // ウォーターマークは一度追加されたら残す
  }

  /**
   * コンソールアクセスを防止
   */
  private static preventConsoleAccess() {
    // 開発環境では無効化
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      return;
    }

    // コンソールオブジェクトを上書き（本番環境のみ）
    const disabledConsole = {
      log: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      error: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      warn: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      info: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      debug: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      clear: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      dir: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      dirxml: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      table: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      trace: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      group: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      groupCollapsed: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      groupEnd: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      count: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      assert: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      time: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      timeEnd: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      profile: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      profileEnd: () => this.showProtectionWarning('コンソールアクセスは制限されています。'),
      timeStamp: () => this.showProtectionWarning('コンソールアクセスは制限されています。')
    };

    // 一定時間後にコンソールを無効化
    setTimeout(() => {
      Object.defineProperty(window, 'console', {
        value: disabledConsole,
        writable: false,
        configurable: false
      });
    }, 3000);
  }

  /**
   * 動画要素にウォーターマークを追加
   */
  private static addWatermarkToVideos() {
    const videos = document.querySelectorAll('video, img[src*="video"], img[src*="mp4"]');
    
    videos.forEach((element) => {
      if (element.dataset.watermarked === 'true') return;
      
      const container = element.parentElement;
      if (!container) return;

      // ウォーターマークレイヤーを作成
      const watermark = document.createElement('div');
      watermark.className = 'debug-watermark';
      watermark.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        background: repeating-linear-gradient(
          45deg,
          rgba(255, 0, 0, 0.1) 0px,
          rgba(255, 0, 0, 0.1) 20px,
          transparent 20px,
          transparent 40px
        );
      `;

      // 中央のテキストウォーターマーク
      const textWatermark = document.createElement('div');
      textWatermark.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 2rem;
        font-weight: bold;
        color: rgba(255, 0, 0, 0.7);
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        white-space: nowrap;
        user-select: none;
        pointer-events: none;
      `;
      textWatermark.textContent = 'DEBUG MODE - UNAUTHORIZED ACCESS';

      // 四隅のロゴウォーターマーク
      const corners = [
        { top: '10px', left: '10px' },
        { top: '10px', right: '10px' },
        { bottom: '10px', left: '10px' },
        { bottom: '10px', right: '10px' }
      ];

      corners.forEach((position) => {
        const logoWatermark = document.createElement('div');
        logoWatermark.style.cssText = `
          position: absolute;
          ${Object.entries(position).map(([key, value]) => `${key}: ${value}`).join('; ')};
          font-size: 1rem;
          font-weight: bold;
          color: rgba(255, 0, 0, 0.8);
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          user-select: none;
          pointer-events: none;
        `;
        logoWatermark.textContent = '⚠️ PROTECTED';
        watermark.appendChild(logoWatermark);
      });

      watermark.appendChild(textWatermark);
      
      // コンテナに相対位置を設定
      if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
        container.style.position = 'relative';
      }
      
      container.appendChild(watermark);
      element.dataset.watermarked = 'true';
    });
  }

  /**
   * 保護警告を表示
   */
  private static showProtectionWarning(message: string) {
    // 開発環境では警告を表示しない
    if (import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development') {
      console.log('Content Protection:', message);
      return;
    }

    // 既存の警告を削除
    const existingWarning = document.querySelector('.content-protection-warning');
    if (existingWarning) {
      existingWarning.remove();
    }

    const warning = document.createElement('div');
    warning.className = 'content-protection-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    warning.textContent = message;
    document.body.appendChild(warning);

    // 3秒後に自動削除
    setTimeout(() => {
      warning.remove();
    }, 3000);
  }

  /**
   * セキュリティイベントをログに記録
   */
  private static async logSecurityEvent(eventType: string, details: any) {
    try {
      await supabase.from('security_logs').insert({
        event_type: eventType,
        details: details,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: await this.getClientIP()
      });
    } catch (error) {
      console.error('Security log error:', error);
    }
  }

  /**
   * クライアントIPアドレスを取得
   */
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * 保護状態を確認
   */
  static isProtected(): boolean {
    return this.isProtectionEnabled;
  }

  /**
   * デバッグモード検出状態を確認
   */
  static isDebugModeDetected(): boolean {
    return this.debugModeDetected;
  }

  /**
   * 開発者ツールの状態を確認
   */
  static isDevToolsOpen(): boolean {
    return this.devToolsOpen;
  }

  /**
   * 保護を無効化（管理者用）
   */
  static disableProtection() {
    this.isProtectionEnabled = false;
  }

  /**
   * 保護を有効化
   */
  static enableProtection() {
    this.isProtectionEnabled = true;
    this.initialize();
  }
}

// CSSアニメーションを追加
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  .debug-watermark {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 0.8;
    }
  }
`;
document.head.appendChild(style);

export default ContentProtection;