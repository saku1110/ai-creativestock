import React, { useState } from 'react';
import { Filter, Grid, List, SlidersHorizontal, Search, Cpu, Zap } from 'lucide-react';
import VideoCard from './VideoCard';
import { VideoAsset } from '../types';

interface VideoGridProps {
  onAuthRequest: () => void;
  isLoggedIn?: boolean;
}

const VideoGrid: React.FC<VideoGridProps> = ({ onAuthRequest, isLoggedIn = false }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  
  // デモ用：未加入ユーザーとして設定（実際のアプリでは認証状態から取得）
  const isSubscribed = false;

  // サンプルデータ（9:16の8秒動画のみ）
  const videos: VideoAsset[] = [
    {
      id: '1',
      title: '実写級美容クリニック向けTikTok動画',
      description: '実写級の美しさでCVRを最大化する美容業界向けTikTok動画広告。プロ品質の映像美で高い訴求力。',
      category: '美容',
      tags: ['美容', 'TikTok広告', '実写級', 'CVR最適化'],
      duration: 8,
      resolution: '9:16 4K',
      price: 2980,
      thumbnailUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-15',
      downloads: 1250,
      rating: 4.8,
      isNew: true,
      isFeatured: true,
      license: 'standard'
    },
    {
      id: '2',
      title: '実写級ダイエット成功Instagram動画',
      description: '実写級の美しさでダイエット成功を表現したInstagram動画広告。リアルな変化で高いCVRを実現。',
      category: 'ダイエット・フィットネス',
      tags: ['ダイエット', 'Instagram広告', '実写級', 'ビフォーアフター'],
      duration: 8,
      resolution: '9:16 4K',
      price: 1980,
      thumbnailUrl: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-14',
      downloads: 890,
      rating: 4.6,
      isNew: false,
      isFeatured: false,
      license: 'standard'
    },
    {
      id: '3',
      title: '実写級ヘアケアYouTube Shorts動画',
      description: '実写級の映像美でヘアケア効果を表現したYouTube Shorts動画広告。美しい髪の変化をリアルに再現。',
      category: 'ヘアケア・美髪',
      tags: ['ヘアケア', 'YouTube広告', '実写級', '美髪'],
      duration: 8,
      resolution: '9:16 4K',
      price: 1580,
      thumbnailUrl: 'https://images.pexels.com/photos/3184434/pexels-photo-3184434.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-13',
      downloads: 2100,
      rating: 4.9,
      isNew: false,
      isFeatured: true,
      license: 'standard'
    },
    {
      id: '4',
      title: '実写級ビジネス成功Facebook動画',
      description: '実写級の映像でビジネス成功を表現したFacebook動画広告。プロフェッショナルな映像美で信頼性向上。',
      category: 'ビジネス・副業',
      tags: ['ビジネス', 'Facebook広告', '実写級', 'B2B'],
      duration: 8,
      resolution: '9:16 4K',
      price: 3980,
      thumbnailUrl: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-12',
      downloads: 650,
      rating: 4.7,
      isNew: true,
      isFeatured: false,
      license: 'extended'
    },
    {
      id: '5',
      title: '実写級暮らし改善LINE動画',
      description: '実写級の映像美でライフスタイル改善を表現したLINE動画広告。日常の美しさをリアルに再現。',
      category: 'ライフスタイル',
      tags: ['ライフスタイル', 'LINE広告', '実写級', '暮らし'],
      duration: 8,
      resolution: '9:16 4K',
      price: 4980,
      thumbnailUrl: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-11',
      downloads: 420,
      rating: 4.5,
      isNew: false,
      isFeatured: true,
      license: 'standard'
    },
    {
      id: '6',
      title: '実写級美容サロンTwitter動画',
      description: '実写級の映像美で美容サロンの魅力を表現したTwitter動画広告。プロ品質の映像で差別化を実現。',
      category: '美容・コスメ',
      tags: ['美容サロン', 'Twitter広告', '実写級', 'サロン集客'],
      duration: 8,
      resolution: '9:16 4K',
      price: 2480,
      thumbnailUrl: 'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-10',
      downloads: 780,
      rating: 4.4,
      isNew: false,
      isFeatured: false,
      license: 'standard'
    }
  ];

  const categories = [
    'all',
    '美容',
    'ダイエット・フィットネス',
    'ヘアケア・美髪', 
    'ビジネス・副業',
    'ライフスタイル'
  ];

  const sortOptions = [
    { value: 'popular', label: '人気順' },
    { value: 'newest', label: '新着順' },
    { value: 'price-low', label: '価格の安い順' },
    { value: 'price-high', label: '価格の高い順' },
    { value: 'rating', label: '評価の高い順' }
  ];

  const filteredVideos = selectedCategory === 'all' 
    ? videos 
    : videos.filter(video => video.category.includes(selectedCategory.split('・')[0]) || video.category === selectedCategory);

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-12 sm:mb-16">
          <div className="mb-8 lg:mb-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6">
             <span className="gradient-text">高品質</span>SNS動画広告素材
            </h2>
           <p className="text-lg sm:text-xl text-gray-400">CVRを最大化するSNS動画広告専用コレクション</p>
          </div>
          
          {isLoggedIn && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            {/* 表示切り替え */}
            <div className="flex items-center space-x-2 glass-effect rounded-2xl p-2 border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 sm:p-4 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 sm:p-4 rounded-xl transition-all ${viewMode === 'list' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
            
            {/* ソート */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="glass-effect border border-white/10 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white bg-black text-sm sm:text-base"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value} className="bg-black">
                  {option.label}
                </option>
              ))}
            </select>
            
            {/* フィルター */}
            <button className="flex items-center justify-center space-x-2 sm:space-x-3 glass-effect border border-white/10 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl hover:border-cyan-400/50 transition-all text-white text-sm sm:text-base">
              <SlidersHorizontal className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">詳細フィルター</span>
              <span className="sm:hidden">フィルター</span>
            </button>
            </div>
          )}
        </div>
        
        {/* カテゴリーフィルター */}
        {isLoggedIn && (
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-12 sm:mb-16">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 sm:px-6 lg:px-8 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                selectedCategory === category
                  ? 'cyber-button text-white shadow-2xl'
                  : 'glass-effect text-gray-400 hover:text-white border border-white/10 hover:border-cyan-400/50'
              }`}
            >
              {category === 'all' ? 'すべて' : category}
            </button>
          ))}
          </div>
        )}
        
        {/* 検索結果情報 */}
        {isLoggedIn && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 sm:mb-12 space-y-4 sm:space-y-0">
          <p className="text-gray-400 text-base sm:text-lg">
            <span className="font-bold text-cyan-400 text-xl sm:text-2xl">{filteredVideos.length}</span>件の高品質SNS動画広告素材が見つかりました
          </p>
          <div className="flex items-center space-x-2 text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
            <span className="font-medium text-sm sm:text-base">高品質・高CVR・9:16・4K</span>
          </div>
          </div>
        )}
        
        {/* 動画グリッド */}
        {isLoggedIn ? (
          <div className={`grid gap-6 sm:gap-8 lg:gap-10 ${
          viewMode === 'grid' 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' 
            : 'grid-cols-1'
          }`}>
          {filteredVideos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              isSubscribed={isSubscribed} 
              onAuthRequest={onAuthRequest} 
            />
          ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-glow">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">高品質動画素材をご覧ください</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              ログインして1000点以上の実写級SNS動画広告素材をご利用ください
            </p>
            <button 
              onClick={onAuthRequest}
              className="cyber-button text-white px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
            >
              今すぐ動画素材を見る
            </button>
          </div>
        )}
        
        {/* もっと見る */}
        {isLoggedIn && (
          <div className="text-center mt-16 sm:mt-20">
          <button className="cyber-button text-white px-8 sm:px-12 lg:px-16 py-4 sm:py-5 lg:py-6 rounded-2xl font-black transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25 transform hover:-translate-y-2 text-base sm:text-lg w-full sm:w-auto">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3">
              <Zap className="w-5 sm:w-6 h-5 sm:h-6" />
              <span>さらに動画広告素材を読み込む</span>
            </div>
          </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default VideoGrid;