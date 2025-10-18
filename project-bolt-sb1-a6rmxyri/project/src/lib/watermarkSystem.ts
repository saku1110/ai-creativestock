// 動的ウォーターマーク生成システム
import { supabase } from './supabase';

/**
 * ウォーターマークの種類
 */
export enum WatermarkType {
  SUBSCRIPTION = 'subscription',
  DEBUG = 'debug',
  UNAUTHORIZED = 'unauthorized',
  TRIAL = 'trial'
}

/**
 * ウォーターマーク設定
 */
export interface WatermarkConfig {
  type: WatermarkType;
  opacity: number;
  size: number;
  color: string;
  text: string;
  position: 'center' | 'corners' | 'pattern' | 'overlay';
  animation?: boolean;
  blinkInterval?: number;
}

/**
 * 動的ウォーターマークシステム
 */
export class WatermarkSystem {
  private static readonly DEFAULT_CONFIGS: Record<WatermarkType, WatermarkConfig> = {
    [WatermarkType.SUBSCRIPTION]: {
      type: WatermarkType.SUBSCRIPTION,
      opacity: 0.3,
      size: 24,
      color: '#ffffff',
      text: 'AI Creative Stock',
      position: 'corners',
      animation: false
    },
    [WatermarkType.DEBUG]: {
      type: WatermarkType.DEBUG,
      opacity: 0.7,
      size: 32,
      color: '#ff0000',
      text: 'DEBUG MODE - UNAUTHORIZED ACCESS',
      position: 'overlay',
      animation: true,
      blinkInterval: 1000
    },
    [WatermarkType.UNAUTHORIZED]: {
      type: WatermarkType.UNAUTHORIZED,
      opacity: 0.8,
      size: 28,
      color: '#ff4444',
      text: '⚠️ UNAUTHORIZED DOWNLOAD',
      position: 'pattern',
      animation: true,
      blinkInterval: 500
    },
    [WatermarkType.TRIAL]: {
      type: WatermarkType.TRIAL,
      opacity: 0.4,
      size: 20,
      color: '#ffa500',
      text: 'TRIAL VERSION',
      position: 'center',
      animation: false
    }
  };

  /**
   * 動画要素にウォーターマークを追加
   */
  static addWatermark(
    element: HTMLElement,
    type: WatermarkType,
    customConfig?: Partial<WatermarkConfig>
  ): void {
    const config = { ...this.DEFAULT_CONFIGS[type], ...customConfig };
    
    // 既存のウォーターマークを削除
    this.removeWatermark(element);
    
    const container = element.parentElement;
    if (!container) return;

    // ウォーターマークレイヤーを作成
    const watermarkLayer = document.createElement('div');
    watermarkLayer.className = `watermark-layer watermark-${type}`;
    watermarkLayer.dataset.watermarkType = type;
    
    // 基本スタイルを設定
    watermarkLayer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    `;

    // 位置とパターンに応じてウォーターマークを配置
    switch (config.position) {
      case 'center':
        this.addCenterWatermark(watermarkLayer, config);
        break;
      case 'corners':
        this.addCornerWatermarks(watermarkLayer, config);
        break;
      case 'pattern':
        this.addPatternWatermark(watermarkLayer, config);
        break;
      case 'overlay':
        this.addOverlayWatermark(watermarkLayer, config);
        break;
    }

    // アニメーションを追加
    if (config.animation) {
      this.addAnimation(watermarkLayer, config);
    }

    // コンテナに相対位置を設定
    if (container.style.position !== 'relative' && container.style.position !== 'absolute') {
      container.style.position = 'relative';
    }
    
    container.appendChild(watermarkLayer);
    element.dataset.watermarked = 'true';
    element.dataset.watermarkType = type;

    // ウォーターマーク追加をログに記録
    this.logWatermarkEvent('watermark_added', {
      type,
      element: element.tagName,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 中央ウォーターマークを追加
   */
  private static addCenterWatermark(container: HTMLElement, config: WatermarkConfig): void {
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: ${config.size}px;
      font-weight: bold;
      color: ${config.color};
      opacity: ${config.opacity};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
      font-family: Arial, sans-serif;
    `;
    watermark.textContent = config.text;
    container.appendChild(watermark);
  }

  /**
   * 四隅ウォーターマークを追加
   */
  private static addCornerWatermarks(container: HTMLElement, config: WatermarkConfig): void {
    const corners = [
      { top: '10px', left: '10px' },
      { top: '10px', right: '10px' },
      { bottom: '10px', left: '10px' },
      { bottom: '10px', right: '10px' }
    ];

    corners.forEach((position) => {
      const watermark = document.createElement('div');
      watermark.style.cssText = `
        position: absolute;
        ${Object.entries(position).map(([key, value]) => `${key}: ${value}`).join('; ')};
        font-size: ${config.size * 0.6}px;
        font-weight: bold;
        color: ${config.color};
        opacity: ${config.opacity};
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        font-family: Arial, sans-serif;
      `;
      watermark.textContent = config.text;
      container.appendChild(watermark);
    });
  }

  /**
   * パターンウォーターマークを追加
   */
  private static addPatternWatermark(container: HTMLElement, config: WatermarkConfig): void {
    // 斜めストライプ背景
    const background = document.createElement('div');
    background.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        45deg,
        ${config.color}33 0px,
        ${config.color}33 20px,
        transparent 20px,
        transparent 40px
      );
      opacity: ${config.opacity * 0.5};
    `;
    container.appendChild(background);

    // 繰り返しテキスト
    const rows = 5;
    const cols = 3;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const watermark = document.createElement('div');
        watermark.style.cssText = `
          position: absolute;
          top: ${(row * 20) + 10}%;
          left: ${(col * 33) + 10}%;
          transform: rotate(-45deg);
          font-size: ${config.size * 0.7}px;
          font-weight: bold;
          color: ${config.color};
          opacity: ${config.opacity};
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
          font-family: Arial, sans-serif;
        `;
        watermark.textContent = config.text;
        container.appendChild(watermark);
      }
    }
  }

  /**
   * オーバーレイウォーターマークを追加
   */
  private static addOverlayWatermark(container: HTMLElement, config: WatermarkConfig): void {
    // 全体オーバーレイ
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        45deg,
        ${config.color}22 25%,
        transparent 25%,
        transparent 75%,
        ${config.color}22 75%
      );
      background-size: 40px 40px;
      opacity: ${config.opacity * 0.3};
    `;
    container.appendChild(overlay);

    // 中央メッセージ
    const message = document.createElement('div');
    message.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: ${config.size}px;
      font-weight: bold;
      color: ${config.color};
      opacity: ${config.opacity};
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      white-space: nowrap;
      font-family: Arial, sans-serif;
      border: 2px solid ${config.color};
      padding: 10px 20px;
      background: rgba(0, 0, 0, 0.3);
    `;
    message.textContent = config.text;
    container.appendChild(message);

    // 警告アイコン
    const warningIcons = [
      { top: '20%', left: '20%' },
      { top: '20%', right: '20%' },
      { bottom: '20%', left: '20%' },
      { bottom: '20%', right: '20%' },
      { top: '50%', left: '10%' },
      { top: '50%', right: '10%' }
    ];

    warningIcons.forEach((position) => {
      const icon = document.createElement('div');
      icon.style.cssText = `
        position: absolute;
        ${Object.entries(position).map(([key, value]) => `${key}: ${value}`).join('; ')};
        font-size: ${config.size * 1.5}px;
        color: ${config.color};
        opacity: ${config.opacity};
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      `;
      icon.textContent = '⚠️';
      container.appendChild(icon);
    });
  }

  /**
   * アニメーションを追加
   */
  private static addAnimation(container: HTMLElement, config: WatermarkConfig): void {
    if (config.blinkInterval) {
      // 点滅アニメーション
      const blinkStyle = document.createElement('style');
      blinkStyle.textContent = `
        @keyframes watermarkBlink {
          0%, 50% { opacity: ${config.opacity}; }
          51%, 100% { opacity: ${config.opacity * 0.3}; }
        }
        
        .watermark-${config.type} {
          animation: watermarkBlink ${config.blinkInterval}ms infinite;
        }
      `;
      document.head.appendChild(blinkStyle);
    }

    // 回転アニメーション
    const rotateStyle = document.createElement('style');
    rotateStyle.textContent = `
      @keyframes watermarkRotate {
        0% { transform: translate(-50%, -50%) rotate(-45deg); }
        25% { transform: translate(-50%, -50%) rotate(-40deg); }
        50% { transform: translate(-50%, -50%) rotate(-45deg); }
        75% { transform: translate(-50%, -50%) rotate(-50deg); }
        100% { transform: translate(-50%, -50%) rotate(-45deg); }
      }
      
      .watermark-${config.type} > div {
        animation: watermarkRotate 3s infinite;
      }
    `;
    document.head.appendChild(rotateStyle);
  }

  /**
   * ウォーターマークを削除
   */
  static removeWatermark(element: HTMLElement): void {
    const container = element.parentElement;
    if (!container) return;

    const existingWatermarks = container.querySelectorAll('.watermark-layer');
    existingWatermarks.forEach(watermark => watermark.remove());

    delete element.dataset.watermarked;
    delete element.dataset.watermarkType;
  }

  /**
   * デバッグモード用ウォーターマークを自動追加
   */
  static addDebugWatermarks(): void {
    const mediaElements = document.querySelectorAll('video, img[src*="video"], img[src*="mp4"], img[alt*="video"]');
    
    mediaElements.forEach((element) => {
      if (element.dataset.watermarked === 'true') return;
      
      this.addWatermark(element as HTMLElement, WatermarkType.DEBUG);
    });
  }

  /**
   * サブスクリプション用ウォーターマークを追加
   */
  static addSubscriptionWatermarks(): void {
    const mediaElements = document.querySelectorAll('video, img[src*="video"], img[src*="mp4"]');
    
    mediaElements.forEach((element) => {
      if (element.dataset.watermarked === 'true') return;
      
      this.addWatermark(element as HTMLElement, WatermarkType.SUBSCRIPTION);
    });
  }

  /**
   * 不正ダウンロード用ウォーターマークを追加
   */
  static addUnauthorizedWatermarks(): void {
    const mediaElements = document.querySelectorAll('video, img[src*="video"], img[src*="mp4"]');
    
    mediaElements.forEach((element) => {
      if (element.dataset.watermarked === 'true') return;
      
      this.addWatermark(element as HTMLElement, WatermarkType.UNAUTHORIZED);
    });
  }

  /**
   * カスタムウォーターマークを追加
   */
  static addCustomWatermark(
    element: HTMLElement,
    text: string,
    options: Partial<WatermarkConfig> = {}
  ): void {
    const config: WatermarkConfig = {
      type: WatermarkType.SUBSCRIPTION,
      opacity: 0.5,
      size: 24,
      color: '#ffffff',
      text: text,
      position: 'center',
      animation: false,
      ...options
    };

    this.addWatermark(element, config.type, config);
  }

  /**
   * すべてのウォーターマークを削除
   */
  static removeAllWatermarks(): void {
    const watermarks = document.querySelectorAll('.watermark-layer');
    watermarks.forEach(watermark => watermark.remove());

    const mediaElements = document.querySelectorAll('[data-watermarked="true"]');
    mediaElements.forEach(element => {
      delete (element as HTMLElement).dataset.watermarked;
      delete (element as HTMLElement).dataset.watermarkType;
    });
  }

  /**
   * ウォーターマークイベントをログに記録
   */
  private static async logWatermarkEvent(eventType: string, details: any): Promise<void> {
    try {
      await supabase.from('watermark_logs').insert({
        event_type: eventType,
        details: details,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Watermark log error:', error);
    }
  }

  /**
   * ウォーターマークの統計情報を取得
   */
  static async getWatermarkStats(): Promise<{
    totalWatermarks: number;
    activeWatermarksByType: Record<string, number>;
    recentEvents: any[];
  }> {
    try {
      const { data: events } = await supabase
        .from('watermark_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      const activeWatermarksByType: Record<string, number> = {};
      const activeWatermarksElements = document.querySelectorAll('[data-watermark-type]');
      
      activeWatermarksElements.forEach((element) => {
        const type = (element as HTMLElement).dataset.watermarkType;
        if (type) {
          activeWatermarksByType[type] = (activeWatermarksByType[type] || 0) + 1;
        }
      });

      return {
        totalWatermarks: activeWatermarksElements.length,
        activeWatermarksByType,
        recentEvents: events || []
      };
    } catch (error) {
      console.error('Watermark stats error:', error);
      return {
        totalWatermarks: 0,
        activeWatermarksByType: {},
        recentEvents: []
      };
    }
  }
}

export default WatermarkSystem;