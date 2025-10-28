// ウォーターマーク設定管理コンポーネント
import React, { useState, useEffect } from 'react';
import { Settings, Wand2, Save, RotateCcw, Eye, EyeOff, Grid3X3 } from 'lucide-react';
import { WatermarkPresets } from '../lib/videoWatermark';

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'diagonal-pattern';
  opacity: number;
  fontSize: number;
  color: string;
  fontFile?: string;
}

interface WatermarkSettingsProps {
  initialSettings?: Partial<WatermarkSettings>;
  onSettingsChange?: (settings: WatermarkSettings) => void;
  showPreview?: boolean;
}

const WatermarkSettingsComponent: React.FC<WatermarkSettingsProps> = ({
  initialSettings = {},
  onSettingsChange,
  showPreview = false
}) => {
  const [settings, setSettings] = useState<WatermarkSettings>({
    enabled: true,
    text: 'AI Creative Stock',
    position: 'diagonal-pattern',
    opacity: 0.3,
    fontSize: 32,
    color: '#ffffff',
    ...initialSettings
  });
  
  const [selectedPreset, setSelectedPreset] = useState('diagonalPattern');

  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const handleChange = (key: keyof WatermarkSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    const defaultSettings: WatermarkSettings = {
      enabled: true,
      text: 'AI Creative Stock',
      position: 'bottom-right',
      opacity: 0.7,
      fontSize: 24,
      color: '#ffffff'
    };
    setSettings(defaultSettings);
  };

  const positions = [
    { value: 'top-left', label: '左上' },
    { value: 'top-right', label: '右上' },
    { value: 'bottom-left', label: '左下' },
    { value: 'bottom-right', label: '右下' },
    { value: 'center', label: '中央' }
  ];

  const colors = [
    { value: '#ffffff', label: '白' },
    { value: '#000000', label: '黒' },
    { value: '#ff0000', label: '赤' },
    { value: '#00ff00', label: '緑' },
    { value: '#0000ff', label: '青' },
    { value: '#ffff00', label: '黄' },
    { value: '#ff00ff', label: 'マゼンタ' },
    { value: '#00ffff', label: 'シアン' }
  ];

  const getPreviewStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      color: settings.color,
      fontSize: `${settings.fontSize}px`,
      opacity: settings.opacity,
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
      zIndex: 10
    };

    switch (settings.position) {
      case 'top-left':
        return { ...baseStyle, top: '10px', left: '10px' };
      case 'top-right':
        return { ...baseStyle, top: '10px', right: '10px' };
      case 'bottom-left':
        return { ...baseStyle, bottom: '10px', left: '10px' };
      case 'bottom-right':
        return { ...baseStyle, bottom: '10px', right: '10px' };
      case 'center':
        return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      default:
        return { ...baseStyle, bottom: '10px', right: '10px' };
    }
  };

  return (
    <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center space-x-2">
          <Wand2 className="w-6 h-6 text-cyan-400" />
          <span>ウォーターマーク設定</span>
        </h3>
        <button
          onClick={resetToDefaults}
          className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center space-x-1"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">リセット</span>
        </button>
      </div>

      {/* 有効/無効スイッチ */}
      <div className="flex items-center justify-between">
        <label className="text-gray-300 font-medium">ウォーターマーク処理</label>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${settings.enabled ? 'text-gray-400' : 'text-white'}`}>無効</span>
          <button
            onClick={() => handleChange('enabled', !settings.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.enabled ? 'bg-cyan-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${settings.enabled ? 'text-white' : 'text-gray-400'}`}>有効</span>
        </div>
      </div>

      {settings.enabled && (
        <>
          {/* ウォーターマークテキスト */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">ウォーターマークテキスト</label>
            <input
              type="text"
              value={settings.text}
              onChange={(e) => handleChange('text', e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
              placeholder="ウォーターマークのテキストを入力"
            />
          </div>

          {/* 位置設定 */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">位置</label>
            <select
              value={settings.position}
              onChange={(e) => handleChange('position', e.target.value)}
              className="w-full bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
            >
              {positions.map(pos => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
          </div>

          {/* 透明度設定 */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              透明度 ({Math.round(settings.opacity * 100)}%)
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={settings.opacity}
              onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* フォントサイズ設定 */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              フォントサイズ ({settings.fontSize}px)
            </label>
            <input
              type="range"
              min="12"
              max="48"
              step="2"
              value={settings.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          {/* 色設定 */}
          <div>
            <label className="block text-gray-300 font-medium mb-2">文字色</label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-12 h-12 bg-gray-800 border border-white/10 rounded-lg cursor-pointer"
              />
              <select
                value={settings.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="flex-1 bg-gray-800/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
              >
                {colors.map(color => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* プレビュー */}
          {showPreview && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-gray-300 font-medium">プレビュー</label>
                <button
                  onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                  className="text-gray-400 hover:text-cyan-400 transition-colors flex items-center space-x-1"
                >
                  {isPreviewVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span className="text-sm">{isPreviewVisible ? '非表示' : '表示'}</span>
                </button>
              </div>
              {isPreviewVisible && (
                <div className="relative w-full h-48 bg-gray-800 rounded-xl overflow-hidden">
                  {/* 背景パターン */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                    <span className="text-lg">動画プレビュー領域</span>
                  </div>
                  
                  {/* ウォーターマークプレビュー */}
                  <div style={getPreviewStyle()}>
                    {settings.text}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 設定情報 */}
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <h4 className="text-cyan-300 font-medium mb-2">現在の設定</h4>
            <div className="text-sm text-cyan-200 space-y-1">
              <div>テキスト: "{settings.text}"</div>
              <div>位置: {positions.find(p => p.value === settings.position)?.label}</div>
              <div>透明度: {Math.round(settings.opacity * 100)}%</div>
              <div>フォントサイズ: {settings.fontSize}px</div>
              <div>色: {colors.find(c => c.value === settings.color)?.label || settings.color}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WatermarkSettingsComponent;