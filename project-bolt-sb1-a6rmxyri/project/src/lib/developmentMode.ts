// 開発環境用のコンテンツ保護バイパス
export class DevelopmentMode {
  private static isDevelopment = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'development';
  
  /**
   * 開発環境かどうかを判定
   */
  static isDev(): boolean {
    return this.isDevelopment;
  }

  /**
   * 開発環境用のコンテンツ保護設定
   */
  static getProtectionSettings() {
    if (this.isDevelopment) {
      return {
        enableRightClickBlock: false,
        enableKeyboardBlock: false,
        enableTextSelection: true,
        enableDragAndDrop: true,
        enableDevToolsDetection: false,
        enableConsoleProtection: false,
        showWarnings: false,
        enableWatermarks: true // ウォーターマークのみ有効
      };
    }

    return {
      enableRightClickBlock: true,
      enableKeyboardBlock: true,
      enableTextSelection: false,
      enableDragAndDrop: false,
      enableDevToolsDetection: true,
      enableConsoleProtection: true,
      showWarnings: true,
      enableWatermarks: true
    };
  }

  /**
   * 開発環境用のログ出力
   */
  static log(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(`[DEV] ${message}`, ...args);
    }
  }

  /**
   * 開発環境用の警告出力
   */
  static warn(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.warn(`[DEV] ${message}`, ...args);
    }
  }

  /**
   * 開発環境用のエラー出力
   */
  static error(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.error(`[DEV] ${message}`, ...args);
    }
  }
}

export default DevelopmentMode;