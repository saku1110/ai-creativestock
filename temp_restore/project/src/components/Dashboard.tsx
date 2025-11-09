import React, { useState } from 'react';
import { Download, Search, Filter, Calendar, Star, Eye, Heart, Folder, Grid, List, ChevronDown, RefreshCw } from 'lucide-react';
import { VideoAsset } from '../types';

interface PurchasedVideo extends VideoAsset {
  purchaseDate: string;
  downloadCount: number;
  maxDownloads: number;
  licenseType: 'standard' | 'extended' | 'commercial';
}

const Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ユーザーの現在のプラン情報（デモデータ）
  const currentPlan = {
    name: 'プロ',
    price: 49800,
    downloadsPerMonth: 30,
    remainingDownloads: 18,
    nextBillingDate: '2024-02-20',
  };

  // サンプルの購入済み動画データ
  const purchasedVideos: PurchasedVideo[] = [
    {
      id: '1',
      title: '美容クリニック向けTikTok広告動画',
      description: '美容業界に最適化されたTikTok広告動画。CVR3.2%を記録した実績ある高品質素材。',
      category: '美容',
      tags: ['美容', 'TikTok', '高CVR'],
      duration: 8,
      resolution: '9:16 4K',
      price: 2980,
      thumbnailUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800',
      videoUrl: '',
      createdAt: '2024-01-15',
      downloads: 1250,
      rating: 4.8,
      isNew: false,
      isFeatured: true,
      license: 'standard',
      purchaseDate: '2024-01-20',
      downloadCount: 3,
      maxDownloads: 10,
      licenseType: 'standard'
    },
    {
      id: '2',
      title: 'ダイエット成功Instagram広告動画',
      description: 'ダイエット業界向けのInstagram広告動画。ビフォーアフターで高い訴求力を実現。',
      category: 'ダイエット・フィットネス',
      tags: ['ダイエット', 'Instagram', 'ビフォーアフター'],
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
      license: 'standard',
      purchaseDate: '2024-01-18',
      downloadCount: 1,
      maxDownloads: 10,
      licenseType: 'extended'
    },
    {
      id: '3',
      title: 'ヘアケア商品YouTube Shorts広告',
      description: 'ヘアケア業界に特化したYouTube Shorts広告。美しい髪の変化を表現した高品質素材。',
      category: 'ヘアケア・美髪',
      tags: ['ヘアケア', 'YouTube', '美髪'],
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
      license: 'standard',
      purchaseDate: '2024-01-16',
      downloadCount: 5,
      maxDownloads: 10,
      licenseType: 'standard'
    }
  ];

  const categories = ['all', '美容', 'ダイエット・フィットネス', 'ヘアケア・美髪', 'ビジネス・副業', 'ライフスタイル'];
  
  const sortOptions = [
    { value: 'recent', label: '購入日順（新しい順）' },
    { value: 'title', label: 'タイトル順' },
    { value: 'category', label: 'カテゴリー順' },
    { value: 'downloads', label: 'ダウンロード回数順' }
  ];

  const filteredVideos = purchasedVideos.filter(video => {
    const matchesCategory = filterCategory === 'all' || video.category === filterCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getLicenseColor = (license: string) => {
    switch (license) {
      case 'standard': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'extended': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'commercial': return 'text-green-400 bg-green-400/10 border-green-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const handleDownload = (video: PurchasedVideo) => {
    if (video.downloadCount >= video.maxDownloads) {
      alert('ダウンロード上限に達しています。');
      return;
    }

    // 実際のダウンロード処理
    const link = document.createElement('a');
    link.href = video.videoUrl || video.thumbnailUrl; // 実際のプロジェクトでは適切な動画URLを使用
    link.download = `${video.title}_${video.id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // ダウンロード成功のフィードバック
    alert(`「${video.title}」のダウンロードを開始しました。`);
    
    // 実際のアプリケーションでは、ここでサーバーにダウンロード回数の更新を送信
    console.log('Download initiated for video:', video.id);
  };

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">
            <span className="gradient-text">購入済み</span>動画広告素材
          </h1>
          <p className="text-lg text-gray-400">
            購入した高品質動画広告素材の管理と再ダウンロードができます
          </p>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Folder className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">{purchasedVideos.length}</h3>
                <p className="text-gray-400 text-sm">購入済み広告素材</p>
              </div>
            </div>
          </div>
          
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {purchasedVideos.reduce((sum, video) => sum + video.downloadCount, 0)}
                </h3>
                <p className="text-gray-400 text-sm">総ダウンロード数</p>
              </div>
            </div>
          </div>
          
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {(purchasedVideos.reduce((sum, video) => sum + video.rating, 0) / purchasedVideos.length).toFixed(1)}
                </h3>
                <p className="text-gray-400 text-sm">平均評価</p>
              </div>
            </div>
          </div>
        </div>

        {/* フィルター・検索エリア */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* 検索 */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                placeholder="動画広告素材を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 glass-effect rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400 border border-white/10"
                />
              </div>
            </div>

            {/* フィルター・ソート */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {/* カテゴリーフィルター */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="glass-effect border border-white/10 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white bg-black"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-black">
                    {category === 'all' ? 'すべてのカテゴリー' : category}
                  </option>
                ))}
              </select>

              {/* ソート */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-effect border border-white/10 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white bg-black"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>

              {/* 表示切り替え */}
              <div className="flex items-center space-x-2 glass-effect rounded-xl p-2 border border-white/10">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 動画リスト */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Folder className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">動画広告素材が見つかりません</h3>
            <p className="text-gray-400">検索条件を変更してお試しください</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
              : 'grid-cols-1'
          }`}>
            {filteredVideos.map((video) => (
              <div key={video.id} className="glass-effect rounded-2xl border border-white/10 overflow-hidden hover-lift">
                {viewMode === 'grid' ? (
                  // グリッド表示
                  <>
                    <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black">
                      <img 
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getLicenseColor(video.licenseType)}`}>
                          {video.licenseType.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{video.title}</h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{video.description}</p>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="glass-effect text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-400/30">
                          {video.category}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(video.purchaseDate)}
                        </span>
                      </div>

                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleDownload(video)}
                          disabled={video.downloadCount >= video.maxDownloads}
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                            video.downloadCount >= video.maxDownloads
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'cyber-button text-white hover:shadow-cyan-500/25'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                          <span>ダウンロード</span>
                        </button>
                        <button className="p-3 glass-effect border border-white/20 text-gray-300 hover:text-white rounded-xl transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // リスト表示
                  <div className="flex items-center p-6 space-x-6">
                    <div className="relative w-24 h-32 bg-gradient-to-br from-gray-900 to-black rounded-xl overflow-hidden flex-shrink-0">
                      <img 
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-white truncate pr-4">{video.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${getLicenseColor(video.licenseType)}`}>
                          {video.licenseType.toUpperCase()}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{video.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                        <span className="glass-effect text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-400/30">
                          {video.category}
                        </span>
                        <span>購入日: {formatDate(video.purchaseDate)}</span>
                        <span>ダウンロード: {video.downloadCount}/{video.maxDownloads}回</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(video)}
                        disabled={video.downloadCount >= video.maxDownloads}
                        className={`py-3 px-6 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                          video.downloadCount >= video.maxDownloads
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'cyber-button text-white hover:shadow-cyan-500/25'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        <span>ダウンロード</span>
                      </button>
                      <button className="p-3 glass-effect border border-white/20 text-gray-300 hover:text-white rounded-xl transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ページネーション（必要に応じて） */}
        {filteredVideos.length > 0 && (
          <div className="text-center mt-12">
            <button className="glass-effect border border-white/20 text-gray-300 hover:text-white px-8 py-4 rounded-xl transition-all font-bold flex items-center space-x-2 mx-auto">
              <RefreshCw className="w-5 h-5" />
              <span>さらに読み込む</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;