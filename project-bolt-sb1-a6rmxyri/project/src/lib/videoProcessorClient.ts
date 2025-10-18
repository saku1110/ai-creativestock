// クライアントサイド用の動画処理ユーティリティ
// TensorFlow.jsとffmpegはサーバーサイドで処理するため、
// クライアントではAPIを呼び出すだけにする

import type { CategoryClassification, VideoCategory } from '../utils/categoryInference';

export type { VideoCategory, CategoryClassification } from '../utils/categoryInference';

export interface VideoMetadata {
  duration: number;
  resolution: string;
  frameRate: number;
  bitrate: number;
  codec: string;
  size: number;
  format: string;
}

export interface VideoValidation {
  valid: boolean;
  errors: string[];
}

export interface ProcessedVideo {
  metadata: VideoMetadata;
  classification: CategoryClassification;
  thumbnailUrl?: string;
  tags: string[];
}

// クライアントサイドの動画処理クラス
export class VideoProcessorClient {
  
  // 動画ファイルの基本検証（クライアントサイド）
  static validateVideoClient(file: File): VideoValidation {
    const errors: string[] = [];
    
    // ファイルサイズチェック（100MB以下）
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size exceeds 100MB limit (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    // ファイル形式チェック
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.mp4')) {
      errors.push(`Unsupported format. Allowed formats: MP4, MOV, AVI, WebM`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // 動画から基本情報を取得（クライアントサイド）
  static async getVideoInfoClient(file: File): Promise<{ duration: number; dimensions: { width: number; height: number } }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          duration: Math.round(video.duration),
          dimensions: {
            width: video.videoWidth,
            height: video.videoHeight
          }
        });
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = url;
    });
  }
  
  // サムネイルを生成（クライアントサイド）
  static async generateThumbnailClient(file: File, timestamp: number = 2): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      const url = URL.createObjectURL(file);
      
      video.preload = 'metadata';
      video.currentTime = timestamp;
      
      video.onseeked = () => {
        // 9:16アスペクト比でキャンバスサイズを設定
        canvas.width = 720;
        canvas.height = 1280;
        
        // ビデオを中央に配置してクロップ
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (videoAspect > canvasAspect) {
          // ビデオが横長の場合
          drawHeight = canvas.height;
          drawWidth = drawHeight * videoAspect;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          // ビデオが縦長の場合
          drawWidth = canvas.width;
          drawHeight = drawWidth / videoAspect;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        }
        
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.9);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };
      
      video.src = url;
    });
  }
  
  // 動画を自動処理（サーバーAPIを呼び出す）
  static async processVideo(file: File, options?: {
    generateThumbnail?: boolean;
    autoClassify?: boolean;
  }): Promise<ProcessedVideo> {
    const formData = new FormData();
    formData.append('video', file);
    
    if (options?.generateThumbnail !== undefined) {
      formData.append('generateThumbnail', String(options.generateThumbnail));
    }
    
    if (options?.autoClassify !== undefined) {
      formData.append('autoClassify', String(options.autoClassify));
    }
    
    const response = await fetch('/api/upload/process', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to process video');
    }
    
    return response.json();
  }
  
  // バッチ処理（複数ファイル）
  static async processBatch(files: File[], onProgress?: (index: number, total: number, file: File) => void): Promise<ProcessedVideo[]> {
    const results: ProcessedVideo[] = [];
    
    for (let i = 0; i < files.length; i++) {
      onProgress?.(i + 1, files.length, files[i]);
      
      try {
        const result = await this.processVideo(files[i], {
          generateThumbnail: true,
          autoClassify: true
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to process ${files[i].name}:`, error);
        // エラーの場合でも続行
        results.push({
          metadata: {
            duration: 0,
            resolution: '0x0',
            frameRate: 0,
            bitrate: 0,
            codec: 'unknown',
            size: files[i].size,
            format: 'unknown'
          },
          classification: {
            category: 'lifestyle',
            confidence: 0,
            keywords: []
          },
          tags: []
        });
      }
    }
    
    return results;
  }
}

export default VideoProcessorClient;
