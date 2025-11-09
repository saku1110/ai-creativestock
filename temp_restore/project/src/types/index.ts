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