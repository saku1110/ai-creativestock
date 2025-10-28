export interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  duration: number; // 短尺動画（通常8秒程度）
  resolution: string; // 常に9:16 4K
  price: number;
  thumbnailUrl: string;
  videoUrl: string;
  createdAt: string;
  downloads: number;
  rating: number;
  isNew?: boolean;
  isFeatured?: boolean;
  license: 'standard' | 'extended';
}

export interface PurchasedVideo extends VideoAsset {
  purchaseDate: string;
  downloadCount: number;
  maxDownloads: number;
  licenseType: 'standard' | 'extended' | 'commercial';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subscription?: {
    plan: 'basic' | 'pro' | 'enterprise';
    isActive: boolean;
    expiresAt: string;
  };
}

export interface CartItem {
  videoId: string;
  video: VideoAsset;
  license: 'standard' | 'extended';
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  count: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  features: string[];
  downloads: number;
  isPopular?: boolean;
}

export interface StagingVideo {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[] | string;
  duration?: number;
  resolution?: string;
  file_url?: string;
  storage_path?: string;
  staging_path?: string;
  thumbnail_url?: string;
  thumbnail_path?: string;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  approved_by?: string;
  production_video_id?: string;
  production_path?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  beauty_sub_category?: string | null;
}
