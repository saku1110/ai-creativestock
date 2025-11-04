import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Download, Heart, X, ChevronLeft, Eye, Bookmark, Crown, Zap, Star } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { useAdmin } from '../hooks/useAdmin';
import { database, supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { localDashboardVideos, hasLocalDashboardVideos } from '../local-content';
import type { BeautySubCategory } from '../utils/categoryInference';
import { getNextDownloadFilename } from '../utils/downloadFilename';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'fitness' | 'haircare' | 'oralcare' | 'business' | 'lifestyle' | 'romance' | 'pet';
  tags: string[];
  duration: number;
  resolution: string;
  file_url: string;
  preview_url?: string;
  thumbnail_url: string;
  is_featured: boolean;
  download_count: number;
  created_at: string;
  beautySubCategory?: BeautySubCategory;
}

interface DashboardProps {
  onLogout?: () => void;
  onPageChange?: (page: string) => void;
}

const isDashboardCategory = (value?: string): value is VideoAsset['category'] => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return ['beauty', 'fitness', 'haircare', 'oralcare', 'business', 'lifestyle', 'romance', 'pet'].includes(normalized);
};

const BEAUTY_SUBCATEGORY_SEQUENCE: BeautySubCategory[] = ['skincare', 'haircare', 'oralcare'];

const BEAUTY_SUBCATEGORY_DATA: Record<BeautySubCategory, { label: string; tag: string }> = {
  skincare: { label: 'スキンケア', tag: 'beauty:skincare' },
  haircare: { label: 'ヘアケア', tag: 'beauty:haircare' },
  oralcare: { label: 'オーラルケア', tag: 'beauty:oralcare' }
};

const deriveBeautySubCategoryFromTags = (tags: string[]): BeautySubCategory | undefined => {
  const normalizedTags = tags.map(tag => tag.toLowerCase());
  for (const [key, value] of Object.entries(BEAUTY_SUBCATEGORY_DATA)) {
    const subCategory = key as BeautySubCategory;
    if (normalizedTags.includes(value.tag)) return subCategory;
  }
  return undefined;
};

const generateSampleVideos = (): VideoAsset[] => {
  const baseCategories: Array<VideoAsset['category']> = ['beauty', 'fitness', 'haircare', 'oralcare', 'business', 'lifestyle', 'romance', 'pet'];
  const items: VideoAsset[] = [];

  baseCategories.forEach((category, categoryIndex) => {
    for (let i = 1; i <= 12; i++) {
      const beautySubCategory = category === 'beauty'
        ? BEAUTY_SUBCATEGORY_SEQUENCE[(categoryIndex + i) % BEAUTY_SUBCATEGORY_SEQUENCE.length]
        : undefined;

      const tags = [category, 'サンプル', `動画${i}`];
      if (beautySubCategory) {
        const meta = BEAUTY_SUBCATEGORY_DATA[beautySubCategory];
        tags.push(meta.tag, meta.label);
      }

      items.push({
        id: `${category}-${i}`,
        title: `${category === 'beauty' ? '美容' :
                 category === 'fitness' ? 'フィットネス' :
                 category === 'haircare' ? 'ヘアケア' :
                 category === 'oralcare' ? 'オーラルケア' :
                 category === 'business' ? 'ビジネス' :
                 category === 'lifestyle' ? 'ライフスタイル' :
                 category === 'romance' ? 'モテ・恋愛' : 'ペット'}動画 ${i}`,
        description: `${category}カテゴリのサンプル動画${i}です。`,
        category,
        tags,
        duration: 12 + (i % 8),
        resolution: '1080x1920',
        file_url: `https://via.placeholder.com/720x1280/6b46c1/ffffff?text=${category}-${i}`,
        thumbnail_url: `https://via.placeholder.com/240x426/6b46c1/ffffff?text=${category}-${i}`,
        is_featured: i <= 6,
        download_count: Math.floor(Math.random() * 1200),
        created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        beautySubCategory,
      });
    }
  });

  return items;
};

const LOCAL_DASHBOARD_ASSETS: VideoAsset[] = hasLocalDashboardVideos
  ? localDashboardVideos.map((video, index) => {
      const category = isDashboardCategory(video.category)
        ? (video.category as VideoAsset['category'])
        : 'lifestyle';

      const baseTitle = video.title || `ローカル動画 ${index + 1}`;
      const rawTags = (video.fileName.replace(/\.[^/.]+$/, '') || '')
        .split(/[-_]/)
        .map(tag => tag.trim())
        .filter(Boolean);
      const tagSet = new Set<string>([category, 'local', ...rawTags]);

      if (video.extraTags) {
        for (const extra of video.extraTags) {
          if (extra) {
            tagSet.add(extra);
          }
        }
      }

      let beautySubCategory: BeautySubCategory | undefined = video.category === 'beauty'
        ? (video as any).beautySubCategory ?? undefined
        : undefined;

      if (category === 'beauty') {
        const derivedFromName = deriveBeautySubCategoryFromTags(Array.from(tagSet));
        beautySubCategory = beautySubCategory || derivedFromName || BEAUTY_SUBCATEGORY_SEQUENCE[index % BEAUTY_SUBCATEGORY_SEQUENCE.length];

        if (beautySubCategory) {
          const beautyMeta = BEAUTY_SUBCATEGORY_DATA[beautySubCategory];
          tagSet.add(beautyMeta.tag);
          tagSet.add(beautyMeta.label);
        }
      }

      const tags = Array.from(tagSet);

      return {
        id: video.id,
        title: baseTitle,
        description: `${baseTitle} (ローカルコンテンツ)`,
        category,
        tags,
        duration: 30,
        resolution: '1080x1920',
        file_url: video.url,
        thumbnail_url: video.url,
        is_featured: index < 3,
        download_count: 0,
        created_at: new Date().toISOString(),
        beautySubCategory
      } satisfies VideoAsset;
    })
  : [];

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onPageChange }) => {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  // 適用中のフィルター（実際の絞り込みに使用）
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set(['all']));
  const [selectedAges, setSelectedAges] = useState<Set<string>>(new Set());
  const [selectedGenders, setSelectedGenders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const [sortBy, setSortBy] = useState('newest');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [downloadingVideos, setDownloadingVideos] = useState<Set<string>>(new Set());
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'category' | 'videoRequest'>('dashboard');
  const [selectedVideoForModal, setSelectedVideoForModal] = useState<VideoAsset | null>(null);

  const {
    user,
    subscription,
    remainingDownloads,
    isTrialUser,
    trialDaysRemaining,
    trialDownloadsRemaining,
    monthlyDownloads
  } = useUser();
  const { isAdmin } = useAdmin();

  // プラン判定
  const resolvedPlanType = useMemo(() => {
    if (!subscription) {
      return isTrialUser ? 'trial' : undefined;
    }
    const extended = subscription as typeof subscription & { plan_type?: string; planType?: string };
    return extended.plan_type ?? extended.planType ?? extended.plan ?? (isTrialUser ? 'trial' : undefined);
  }, [subscription, isTrialUser]);

  const isEnterpriseUser = resolvedPlanType === 'enterprise';
  const canUpgradePlan = !isEnterpriseUser;

  const trialLimit = subscription?.trial_downloads_limit ?? 0;
  const computedTrialUsed = subscription?.trial_downloads_used ?? (trialLimit > 0 ? trialLimit - trialDownloadsRemaining : 0);
  const downloadsUsed = Math.max(0, isTrialUser ? Math.min(trialLimit || Number.MAX_SAFE_INTEGER, computedTrialUsed) : monthlyDownloads);
  const downloadLimit = Math.max(
    0,
    isTrialUser ? trialLimit : subscription?.monthly_download_limit ?? 0
  );
  const hasDownloadCap = downloadLimit > 0;
  const downloadProgress = hasDownloadCap && downloadLimit > 0
    ? Math.min(100, Math.round((downloadsUsed / downloadLimit) * 100))
    : 0;
  const safeRemaining = Math.max(
    0,
    isTrialUser ? trialDownloadsRemaining : remainingDownloads
  );
  const limitDisplay = hasDownloadCap ? downloadLimit.toLocaleString() : '制限なし';
  const remainingDisplay = hasDownloadCap ? safeRemaining.toLocaleString() : '制限なし';

  const planTheme = useMemo(() => {
    if (isTrialUser) {
      return {
        label: 'スタータープラン',
        badgeClass: 'bg-amber-100 text-amber-700',
        iconBg: 'bg-amber-500/15',
        iconColor: 'text-amber-600',
        meterClass: 'bg-amber-400',
        buttonGradient: 'from-amber-400 to-amber-500',
        icon: Star
      };
    }

    switch (resolvedPlanType) {
      case 'pro':
        return {
          label: 'プロ',
          badgeClass: 'bg-sky-100 text-sky-700',
          iconBg: 'bg-sky-500/15',
          iconColor: 'text-sky-600',
          meterClass: 'bg-sky-500',
          buttonGradient: 'from-sky-500 to-indigo-500',
          icon: Zap
        };
      case 'enterprise':
        return {
          label: 'ビジネス',
          badgeClass: 'bg-violet-100 text-violet-700',
          iconBg: 'bg-violet-500/15',
          iconColor: 'text-violet-600',
          meterClass: 'bg-violet-500',
          buttonGradient: 'from-violet-500 to-violet-600',
          icon: Crown
        };
      case 'standard':
        return {
          label: 'スタンダード',
          badgeClass: 'bg-rose-100 text-rose-600',
          iconBg: 'bg-rose-500/15',
          iconColor: 'text-rose-500',
          meterClass: 'bg-rose-500',
          buttonGradient: 'from-[#ff5392] to-[#ff8ec2]',
          icon: Download
        };
      default:
        return {
          label: '未登録',
          badgeClass: 'bg-slate-200 text-slate-600',
          iconBg: 'bg-slate-200',
          iconColor: 'text-slate-500',
          meterClass: 'bg-slate-400',
          buttonGradient: 'from-slate-500 to-slate-600',
          icon: Download
        };
    }
  }, [isTrialUser, resolvedPlanType]);
  const PlanIcon = planTheme.icon;

  const handleUpgradeClick = useCallback(() => {
    if (!canUpgradePlan) return;
    if (onPageChange) {
      onPageChange('pricing');
    } else if (typeof window !== 'undefined') {
      window.open('/pricing', '_self');
    }
  }, [canUpgradePlan, onPageChange]);

  // カテゴリー定義
  const categories = [
    { id: 'all', name: '全て', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'beauty', name: '美容', color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
    { id: 'fitness', name: 'フィットネス', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { id: 'haircare', name: 'ヘアケア', color: 'bg-gradient-to-r from-purple-500 to-violet-500' },
    { id: 'oralcare', name: 'オーラルケア', color: 'bg-gradient-to-r from-cyan-500 to-blue-500' },
    { id: 'business', name: 'ビジネス', color: 'bg-gradient-to-r from-blue-500 to-indigo-500' },
    { id: 'lifestyle', name: 'ライフスタイル', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
    { id: 'romance', name: 'モテ・恋愛', color: 'bg-gradient-to-r from-rose-500 to-pink-600' },
    { id: 'pet', name: 'ペット', color: 'bg-gradient-to-r from-amber-500 to-orange-600' }
  ];

  // 年齢フィルター定義
  const ageFilters = [
    { id: 'all', name: '全年齢' },
    { id: 'teen', name: '10代' },
    { id: 'twenties', name: '20代' },
    { id: 'thirties', name: '30代' },
    { id: 'forties', name: '40代' },
    { id: 'fifties_plus', name: '50代以上' }
  ];

  // 性別フィルター定義
  const genderFilters = [
    { id: 'all', name: '全性別' },
    { id: 'female', name: '女性' },
    { id: 'male', name: '男性' },
    { id: 'mixed', name: '男女' }
  ];

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        setSelectedCategories(new Set(['all']));
        setSelectedAges(new Set());
        setSelectedGenders(new Set());
        setShowOnlyFavorites(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCategoryClick = useCallback((categoryId: string) => {
    const next = new Set<string>();
    if (categoryId === 'all') {
      next.add('all');
    } else {
      next.add(categoryId);
    }
    setSelectedCategories(next);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchVideos = async () => {
      try {
        setLoading(true);

        if (LOCAL_DASHBOARD_ASSETS.length > 0) {
          if (!isMounted) return;
          setVideos(LOCAL_DASHBOARD_ASSETS);
          setLoading(false);
          return;
        }

        const useSampleData = (import.meta.env.DEV && import.meta.env.VITE_USE_SAMPLE_DATA === 'true') || !supabase;
        if (useSampleData) {
          if (!isMounted) return;
          setVideos(generateSampleVideos());
          setLoading(false);
          return;
        }

        const { data, error } = await database.getVideoAssets();
        if (!isMounted) return;

        if (!error && data && data.length > 0) {
          let downloadCountMap: Record<string, number> = {};

          try {
            const { data: downloadStats, error: statsError } = await supabase
              .from('download_history')
              .select('video_id, count=video_id', { head: false })
              .group('video_id');

            if (!statsError && Array.isArray(downloadStats)) {
              downloadCountMap = downloadStats.reduce<Record<string, number>>((acc, stat: any) => {
                if (stat?.video_id) {
                  acc[stat.video_id] = typeof stat.count === 'number' ? stat.count : Number(stat.count) || 0;
                }
                return acc;
              }, {});
            }
          } catch (statsError) {
            console.error('ダウンロード統計の取得に失敗しました:', statsError);
          }

          const transformed = data.map((row: any) => {
            const tags: string[] = Array.isArray(row.tags) ? [...row.tags] : [];
            const beautySubCategory: BeautySubCategory | undefined = row.category === 'beauty'
              ? (row.beauty_sub_category as BeautySubCategory | null) ?? deriveBeautySubCategoryFromTags(tags)
              : undefined;

            if (beautySubCategory) {
              const meta = BEAUTY_SUBCATEGORY_DATA[beautySubCategory];
              if (!tags.includes(meta.tag)) tags.push(meta.tag);
              if (!tags.includes(meta.label)) tags.push(meta.label);
            }

            return {
              id: row.id,
              title: row.title,
              description: row.description ?? '',
              category: row.category,
              tags,
              duration: row.duration ?? 0,
              resolution: row.resolution ?? '1080x1920',
              file_url: row.file_url,
              thumbnail_url: row.thumbnail_url,
              is_featured: !!row.is_featured,
              download_count: downloadCountMap[row.id] ?? row.download_count ?? 0,
              created_at: row.created_at ?? new Date().toISOString(),
              beautySubCategory,
            } satisfies VideoAsset;
          });

          setVideos(transformed);
        } else {
          setVideos(generateSampleVideos());
        }
      } catch (error) {
        console.error('動画の読み込みに失敗しました:', error);
        if (isMounted) {
          setVideos(generateSampleVideos());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleFavorite = useCallback(async (videoId: string) => {
    setUserFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });

    if (!user) return;

    try {
      if (userFavorites.has(videoId)) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
      } else {
        await supabase
          .from('user_favorites')
          .insert([{ user_id: user.id, video_id: videoId }]);
      }
    } catch (error) {
      console.error('お気に入りエラー:', error);
    }
  }, [user, userFavorites]);

  const handleDownload = useCallback(async (video: VideoAsset) => {
    const triggerDownload = () => {
      const link = document.createElement('a');
      link.href = video.file_url;
      link.download = getNextDownloadFilename(video.file_url);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (!user) {
      triggerDownload();
      return;
    }

    if ((isTrialUser && trialDownloadsRemaining <= 0) || (!isTrialUser && remainingDownloads <= 0)) {
      alert('ダウンロード制限に達しました。プランをアップグレードしてください。');
      return;
    }

    try {
      setDownloadingVideos(prev => new Set(prev).add(video.id));
      await database.addDownloadHistory(user.id, video.id);
      triggerDownload();
      setTimeout(() => {
        setDownloadingVideos(prev => {
          const next = new Set(prev);
          next.delete(video.id);
          return next;
        });
      }, 1200);
    } catch (error) {
      console.error('ダウンロードエラー:', error);
      setDownloadingVideos(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  }, [user, isTrialUser, trialDownloadsRemaining, remainingDownloads]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategories(new Set(['all']));
    setSelectedAges(new Set());
    setSelectedGenders(new Set());
    setShowOnlyFavorites(false);
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategories(prev => {
      const next = new Set<string>();
      if (categoryId === 'all') {
        next.add('all');
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleTagClick = useCallback((tag: string) => {
    const lower = tag.toLowerCase();

    setSelectedAges(prev => {
      const next = new Set(prev);
      if (lower.includes('10代') || lower.includes('teen')) next.add('teen');
      if (lower.includes('20代') || lower.includes('20s')) next.add('twenties');
      if (lower.includes('30代') || lower.includes('30s')) next.add('thirties');
      if (lower.includes('40代') || lower.includes('40s')) next.add('forties');
      if (lower.includes('50代') || lower.includes('シニア') || lower.includes('50s')) next.add('fifties_plus');
      return next;
    });

    setSelectedGenders(prev => {
      const next = new Set(prev);
      if (lower.includes('女性') || lower.includes('女') || lower.includes('female') || lower.includes('woman')) next.add('female');
      if (lower.includes('男性') || lower.includes('男') || lower.includes('male') || lower.includes('man')) next.add('male');
      if (lower.includes('男女') || lower.includes('カップル') || lower.includes('couple') || lower.includes('mixed')) next.add('mixed');
      return next;
    });
  }, []);

  const handleAgeSelect = useCallback((ageId: string) => {
    if (ageId === 'all') {
      setSelectedAges(new Set());
    } else {
      setSelectedAges(new Set([ageId]));
    }
  }, []);

  const handleGenderSelect = useCallback((genderId: string) => {
    if (genderId === 'all') {
      setSelectedGenders(new Set());
    } else {
      setSelectedGenders(new Set([genderId]));
    }
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const filteredVideos = useMemo(() => {
    const activeVideos = videos.filter(video => {
      if (!selectedCategories.has('all') && selectedCategories.size > 0 && !selectedCategories.has(video.category)) {
        return false;
      }

      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchTitle = video.title?.toLowerCase().includes(query);
        const matchDescription = video.description?.toLowerCase().includes(query);
        const matchTag = video.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchDescription && !matchTag) return false;
      }

      if (selectedAges.size > 0) {
        const hasAgeTag = video.tags.some(tag => {
          const lowerTag = tag.toLowerCase();
          return Array.from(selectedAges).some(selectedAge => {
            switch (selectedAge) {
              case 'teen': return lowerTag.includes('10代') || lowerTag.includes('ティーン') || lowerTag.includes('teen');
              case 'twenties': return lowerTag.includes('20代') || lowerTag.includes('20s');
              case 'thirties': return lowerTag.includes('30代') || lowerTag.includes('30s');
              case 'forties': return lowerTag.includes('40代') || lowerTag.includes('40s');
              case 'fifties_plus': return lowerTag.includes('50代') || lowerTag.includes('シニア') || lowerTag.includes('50s');
              default: return false;
            }
          });
        });
        if (!hasAgeTag) return false;
      }

      if (selectedGenders.size > 0) {
        const hasGenderTag = video.tags.some(tag => {
          const lowerTag = tag.toLowerCase();
          return Array.from(selectedGenders).some(selectedGender => {
            switch (selectedGender) {
              case 'female': return lowerTag.includes('女性') || lowerTag.includes('女') || lowerTag.includes('female') || lowerTag.includes('woman');
              case 'male': return lowerTag.includes('男性') || lowerTag.includes('男') || lowerTag.includes('male') || lowerTag.includes('man');
              case 'mixed': return lowerTag.includes('男女') || lowerTag.includes('カップル') || lowerTag.includes('couple') || lowerTag.includes('mixed');
              default: return false;
            }
          });
        });
        if (!hasGenderTag) return false;
      }

      if (showOnlyFavorites && !userFavorites.has(video.id)) {
        return false;
      }

      return true;
    });

    const sorted = [...activeVideos].sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.download_count - a.download_count;
        case 'shortest':
          return a.duration - b.duration;
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return sorted;
  }, [videos, selectedCategories, selectedAges, selectedGenders, showOnlyFavorites, userFavorites, sortBy, debouncedSearchQuery]);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col items-center gap-5 text-center">
          <div className="w-full">
            <h1 className="text-2xl font-bold text-white mb-3">動画ライブラリ</h1>
            <div className="relative w-full max-w-sm sm:max-w-md md:w-[520px] lg:w-[680px] xl:w-[820px] mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 md:h-5 md:w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="キーワードで検索（タイトル、タグなど）"
                className="w-full rounded-full border border-slate-700 bg-slate-800 py-2.5 sm:py-3 pl-10 sm:pl-12 pr-4 sm:pr-5 text-sm sm:text-base text-white placeholder:text-slate-400 transition focus:border-[#6366f1] focus:bg-slate-900 focus:outline-none shadow-lg"
              />
            </div>
          </div>
          {isTrialUser && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-200">
                有効期限まで {trialDaysRemaining} 日 / 残り {trialDownloadsRemaining} 本
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="py-8 md:py-12">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-72 shrink-0 space-y-6">
              <div className="rounded-3xl border border-[#ececf5] bg-white p-6 shadow-[0_25px_60px_rgba(18,26,53,0.08)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-black filter-heading force-black">絞り込み条件</h2>
                  <button onClick={handleClearFilters} className="text-xs font-semibold text-rose-500 hover:text-rose-600">
                    クリア
                  </button>
                </div>
                <div className="mt-6 space-y-8 text-sm">
                  <div>
                    <p className="mb-3 font-semibold text-black">カテゴリー</p>
                    <div className="space-y-2">
                      {categories.filter(cat => cat.id !== 'all').map((category) => (
                        <label key={category.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors">
                          <span className="font-medium text-black">{category.name}</span>
                          <input
                            type="radio"
                            name="category"
                            value={category.id}
                            checked={!selectedCategories.has('all') && selectedCategories.has(category.id)}
                            onChange={() => handleCategorySelect(category.id)}
                            className="accent-rose-500"
                          />
                        </label>
                      ))}
                      <label className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 px-3 py-2 text-black hover:bg-slate-50 cursor-pointer transition-colors">
                        <span className="text-black">すべて</span>
                        <input
                          type="radio"
                          name="category"
                          value="all"
                          checked={selectedCategories.has('all')}
                          onChange={() => handleCategorySelect('all')}
                          className="accent-rose-500"
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-semibold text-black">年齢層</p>
                    <div className="space-y-2">
                      {ageFilters.map((age) => (
                        <label key={age.id} className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors">
                          <span className="text-black">{age.name}</span>
                          <input
                            type="radio"
                            name="age"
                            value={age.id}
                            checked={age.id === 'all' ? selectedAges.size === 0 : selectedAges.has(age.id)}
                            onChange={() => handleAgeSelect(age.id)}
                            className="accent-rose-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 font-semibold text-black">性別</p>
                    <div className="space-y-2">
                      {genderFilters.map((gender) => (
                        <label key={gender.id} className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors">
                          <span className="text-black">{gender.name}</span>
                          <input
                            type="radio"
                            name="gender"
                            value={gender.id}
                            checked={gender.id === 'all' ? selectedGenders.size === 0 : selectedGenders.has(gender.id)}
                            onChange={() => handleGenderSelect(gender.id)}
                            className="accent-rose-500"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-black cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyFavorites}
                        onChange={(e) => setShowOnlyFavorites(e.target.checked)}
                        className="accent-rose-500"
                      />
                      お気に入りのみ表示
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#ececf5] bg-white p-6 shadow-[0_25px_60px_rgba(18,26,53,0.08)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">現在のプラン</p>
                    <div className="mt-2 flex flex-col gap-1">
                      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${planTheme.badgeClass}`}>
                        {planTheme.label}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {subscription?.status ? `ステータス: ${subscription.status}` : 'ステータス: 未設定'}
                      </span>
                    </div>
                  </div>
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${planTheme.iconBg}`}>
                    <PlanIcon className={`h-5 w-5 ${planTheme.iconColor}`} />
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">現在のダウンロード数</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {downloadsUsed.toLocaleString()}
                      <span className="ml-2 text-sm font-semibold text-slate-400">
                        / {hasDownloadCap ? `${limitDisplay} 本` : limitDisplay}
                      </span>
                    </p>
                  </div>

                  {hasDownloadCap && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>今月の進捗</span>
                        <span className="font-semibold text-slate-600">{downloadProgress}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${planTheme.meterClass}`}
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>残りダウンロード</span>
                      <span className="font-semibold text-slate-700">
                        {hasDownloadCap ? `${remainingDisplay} 本` : remainingDisplay}
                      </span>
                    </div>
                    {!hasDownloadCap && (
                      <p className="mt-2 text-[11px] text-slate-400">制限なしのプランでは残り回数は表示されません。</p>
                    )}
                    {isTrialUser && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      有効期限まで {Math.max(0, trialDaysRemaining)} 日 / 残り {Math.max(0, trialDownloadsRemaining).toLocaleString()} 本
                    </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpgradeClick}
                  disabled={!canUpgradePlan}
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-semibold text-white transition ${
                    canUpgradePlan ? 'shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transform hover:scale-105' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  {canUpgradePlan ? 'プランをアップグレード' : 'ビジネスプラン適用中'}
                </button>
              </div>
            </aside>
                <section className="flex-1 lg:max-w-[calc(100%-18rem)] lg:mx-auto">
                  <div className="rounded-3xl border border-[#ececf5] bg-white p-6 shadow-[0_25px_60px_rgba(18,26,53,0.05)]">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-slate-900">動画一覧</h1>
                      </div>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="rounded-full border border-[#e4e5f2] bg-white px-4 py-2 text-sm font-medium text-slate-600 focus:border-[#ff5392] focus:outline-none"
                        >
                          <option value="popular">人気順</option>
                          <option value="newest">新着順</option>
                          <option value="shortest">短い順</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    {currentPage === 'dashboard' && (
                      <>
                        {loading ? (
                          <div className="flex items-center justify-center py-20">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#ffd6e6] border-t-[#ff5392]" />
                          </div>
                        ) : (
                          <>
                            {filteredVideos.length === 0 ? (
                              <div className="rounded-3xl border border-dashed border-[#d9daeb] bg-white px-6 py-16 text-center text-sm text-slate-500">
                                条件に一致する動画が見つかりませんでした。
                              </div>
                            ) : (
                              <>
                                {(
                                  !selectedCategories.has('all') ||
                                  selectedAges.size > 0 ||
                                  selectedGenders.size > 0 ||
                                  showOnlyFavorites ||
                                  Boolean(debouncedSearchQuery)
                                ) ? (
                                  <div className="grid gap-5 sm:gap-6 lg:gap-8 xl:gap-10 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
                                    {filteredVideos.map((video) => (
                                      <VideoCard
                                        key={video.id}
                                        video={video}
                                        onClick={() => setSelectedVideoForModal(video)}
                                        isFavorited={userFavorites.has(video.id)}
                                        isDownloading={downloadingVideos.has(video.id)}
                                        onDownload={() => handleDownload(video)}
                                        onToggleFavorite={() => toggleFavorite(video.id)}
                                        onTagClick={handleTagClick}
                                        onCategoryClick={handleCategoryClick}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-10">
                                    <VideoSection
                                    title="新着動画"
                                      videos={filteredVideos.slice(0, 12)}
                                      onVideoClick={setSelectedVideoForModal}
                                      userFavorites={userFavorites}
                                      downloadingVideos={downloadingVideos}
                                      onDownload={handleDownload}
                                      onToggleFavorite={toggleFavorite}
                                      onTagClick={handleTagClick}
                                      onCategoryClick={handleCategoryClick}
                                    />
                                    {categories
                                      .filter(cat => cat.id !== 'all')
                                      .map((category) => {
                                        const categoryVideos = filteredVideos.filter(video => video.category === category.id).slice(0, 10);
                                        if (categoryVideos.length === 0) return null;
                                        return (
                                          <VideoSection
                                            key={category.id}
                                            title={`${category.name}の人気素材`}
                                            videos={categoryVideos}
                                            onVideoClick={setSelectedVideoForModal}
                                            userFavorites={userFavorites}
                                            downloadingVideos={downloadingVideos}
                                            onDownload={handleDownload}
                                            onToggleFavorite={toggleFavorite}
                                            onTagClick={handleTagClick}
                                            onCategoryClick={handleCategoryClick}
                                            onShowAll={() => {
                                              handleCategoryClick(category.id);
                                              setCurrentPage('category');
                                            }}
                                          />
                                        );
                                      })}
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {currentPage === 'category' && (
                      <CategoryDetailPage
                        selectedCategories={selectedCategories}
                        videos={filteredVideos}
                        onVideoClick={setSelectedVideoForModal}
                        userFavorites={userFavorites}
                        downloadingVideos={downloadingVideos}
                        onDownload={handleDownload}
                        onToggleFavorite={toggleFavorite}
                        onBack={() => setCurrentPage('dashboard')}
                      />
                    )}

                    {currentPage === 'videoRequest' && isEnterpriseUser && (
                      <VideoRequestPage onBack={() => setCurrentPage('dashboard')} />
                    )}
                  </div>
                </section>
              </div>
            </div>
          </main>

      {selectedVideoForModal && (
        <VideoModal 
          video={selectedVideoForModal} 
          onClose={() => setSelectedVideoForModal(null)}
          onDownload={() => handleDownload(selectedVideoForModal)}
          onToggleFavorite={() => toggleFavorite(selectedVideoForModal.id)}
          isFavorited={userFavorites.has(selectedVideoForModal.id)}
        />
      )}
    </div>
  );

};


// CategoryDetailPageコンポーネント - カテゴリー詳細ページ
const CategoryDetailPage: React.FC<{
  selectedCategories: Set<string>;
  videos: VideoAsset[];
  onVideoClick: (video: VideoAsset) => void;
  userFavorites: Set<string>;
  downloadingVideos: Set<string>;
  onDownload: (video: VideoAsset) => void;
  onToggleFavorite: (videoId: string) => void;
  onBack: () => void;
}> = ({ selectedCategories, videos, onVideoClick, userFavorites, downloadingVideos, onDownload, onToggleFavorite, onBack }) => {
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const videosPerPage = 20; // 5×4 = 20枚
  
  const categoryName = Array.from(selectedCategories)[0];
  const categoryVideos = videos.filter(video => selectedCategories.has(video.category));
  
  const totalPages = Math.ceil(categoryVideos.length / videosPerPage);
  const startIndex = (currentPageNum - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  const currentVideos = categoryVideos.slice(startIndex, endIndex);
  
  const categoryNames = {
    beauty: '美容',
    fitness: 'フィットネス',
    haircare: 'ヘアケア',
    oralcare: 'オーラルケア',
    business: 'ビジネス',
    lifestyle: 'ライフスタイル',
    romance: 'モテ・恋愛',
    pet: 'ペット'
  };

  return (
    <div className="space-y-10">
      {/* カテゴリーヘッダー */}
      <div className="rounded-[32px] border border-gray-100 bg-white p-8 shadow-[0_35px_65px_-40px_rgba(15,23,42,0.5)]">
        <button 
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors duration-300 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </button>
        <h1 className="text-3xl font-bold text-slate-900">
          {categoryNames[categoryName as keyof typeof categoryNames] || categoryName}動画一覧
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {categoryVideos.length}件の動画が見つかりました。最新のUGC素材を活用して広告制作を加速させましょう。
        </p>
      </div>
      
      {/* 動画グリッド */}
      <div className="-mx-2 flex flex-wrap gap-y-4 sm:-mx-3 sm:gap-y-5 md:-mx-3 md:gap-y-6">
        {currentVideos.map((video) => (
          <div key={video.id} className="w-1/2 px-2 sm:w-1/3 sm:px-3 md:w-1/4 lg:w-1/5 xl:w-1/5">
            <VideoCard
              video={video}
              onClick={() => onVideoClick(video)}
              isFavorited={userFavorites.has(video.id)}
              isDownloading={downloadingVideos.has(video.id)}
              onDownload={() => onDownload(video)}
              onToggleFavorite={() => onToggleFavorite(video.id)}
            />
          </div>
        ))}
      </div>
      
      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-10">
          <button 
            onClick={() => setCurrentPageNum(Math.max(1, currentPageNum - 1))}
            disabled={currentPageNum === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 cursor-pointer transition-all duration-300 text-sm hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          
          <div className="flex gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPageNum <= 3) {
                pageNum = i + 1;
              } else if (currentPageNum >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPageNum - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPageNum(pageNum)}
                  className={`px-4 py-2 border rounded-lg text-sm cursor-pointer transition-all duration-300 ${
                    currentPageNum === pageNum
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            onClick={() => setCurrentPageNum(Math.min(totalPages, currentPageNum + 1))}
            disabled={currentPageNum === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 cursor-pointer transition-all duration-300 text-sm hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
          
          <div className="text-gray-500 text-sm ml-4">
            {startIndex + 1}-{Math.min(endIndex, categoryVideos.length)} / {categoryVideos.length}件
          </div>
        </div>
      )}
    </div>
  );
};


const VideoSection: React.FC<{
  title: string;
  videos: VideoAsset[];
  onVideoClick: (video: VideoAsset) => void;
  userFavorites: Set<string>;
  downloadingVideos: Set<string>;
  onDownload: (video: VideoAsset) => void;
  onToggleFavorite: (videoId: string) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (categoryId: string) => void;
  onShowAll?: () => void;
}> = ({ title, videos, onVideoClick, userFavorites, downloadingVideos, onDownload, onToggleFavorite, onTagClick, onCategoryClick, onShowAll }) => {
  if (videos.length === 0) return null;

  return (
    <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-[0_35px_65px_-40px_rgba(15,23,42,0.5)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-bold lg:text-2xl section-heading">{title}</h2>
        </div>
        {onShowAll && (
          <button
            onClick={onShowAll}
            className="self-start rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 lg:self-center"
          >
            すべてを見る
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 sm:gap-6 lg:gap-8 xl:gap-10 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            onClick={() => onVideoClick(video)}
            isFavorited={userFavorites.has(video.id)}
            isDownloading={downloadingVideos.has(video.id)}
            onDownload={() => onDownload(video)}
            onToggleFavorite={() => onToggleFavorite(video.id)}
            onTagClick={onTagClick}
            onCategoryClick={onCategoryClick}
          />
        ))}
      </div>
    </section>
  );
};

// VideoRequestPageコンポーネント - 動画リクエストページ（ビジネス限定）
const VideoRequestPage: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    bodyType: '',
    background: '',
    scene: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // メール送信用のデータ作成
      const emailBody = `
動画リクエストが届きました

【ユーザー情報】
メールアドレス: ${user?.email || '不明'}
ユーザーID: ${user?.id || '不明'}

【リクエスト内容】
年齢: ${formData.age}
性別: ${formData.gender}
体系: ${formData.bodyType}
背景: ${formData.background}
シーン詳細: ${formData.scene}

送信日時: ${new Date().toLocaleString('ja-JP')}
      `.trim();

      // mailto リンクを使用してメール送信
      const mailtoLink = `mailto:request@ai-creativestock.com?subject=${encodeURIComponent('動画リクエスト')}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailtoLink;

      alert('メーラーが起動しました。送信を完了してください。');

      // フォームをリセット
      setFormData({
        age: '',
        gender: '',
        bodyType: '',
        background: '',
        scene: ''
      });
    } catch (error) {
      console.error('リクエスト送信エラー:', error);
      alert('リクエストの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* リクエストヘッダー */}
      <div className="bg-white border border-gray-200 shadow-sm py-8 mb-8 rounded-lg text-center">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-gray-600 text-sm mb-4 hover:text-gray-800 transition-colors duration-300"
        >
          <ChevronLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">動画リクエスト</h1>
        <p className="text-lg text-gray-600">ビジネスプラン限定のカスタム動画制作サービス</p>
      </div>

      {/* フォーム */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 年齢 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">年齢 *</label>
            <select
              required
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">選択してください</option>
              <option value="10代">10代</option>
              <option value="20代">20代</option>
              <option value="30代">30代</option>
              <option value="40代">40代</option>
              <option value="50代">50代</option>
              <option value="60代以上">60代以上</option>
            </select>
          </div>

          {/* 性別 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">性別 *</label>
            <select
              required
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">選択してください</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
            </select>
          </div>

          {/* 体系 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">体系 *</label>
            <select
              required
              value={formData.bodyType}
              onChange={(e) => setFormData({...formData, bodyType: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">選択してください</option>
              <option value="細身">細身</option>
              <option value="標準">標準</option>
              <option value="ぽっちゃり">ぽっちゃり</option>
              <option value="筋肉質">筋肉質</option>
            </select>
          </div>

          {/* 背景 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">背景 *</label>
            <input
              type="text"
              required
              value={formData.background}
              onChange={(e) => setFormData({...formData, background: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="例: オフィス、カフェ、自宅、屋外など"
            />
          </div>

          {/* シーン詳細 */}
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2">シーン詳細 *</label>
            <textarea
              required
              value={formData.scene}
              onChange={(e) => setFormData({...formData, scene: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-900 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 min-h-[120px]"
              placeholder="例: 笑顔でスマートフォンを操作している、商品を手に取って説明している、など具体的なシーンを記載してください"
            />
          </div>

          {/* 送信ボタン */}
          <div className="text-center pt-5 border-t border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white border-none px-10 py-4 rounded-full text-lg font-bold cursor-pointer transition-all duration-300 hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '送信中...' : 'リクエスト送信'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// VideoModalコンポーネント - フルスクリーンプレビュー
const VideoModal: React.FC<{
  video: VideoAsset;
  onClose: () => void;
  onDownload: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
}> = ({ video, onClose, onDownload, onToggleFavorite, isFavorited }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-screen overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        
        {/* モーツルヘッダー */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-gray-900 text-xl font-bold">動画プレビュー</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 text-3xl font-bold cursor-pointer transition-colors duration-300 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        {/* 動画部分 */}
        <div className="relative p-5 text-center">
          <video 
            src={video.file_url} 
            controls 
            className="w-full max-w-md rounded-2xl bg-black mx-auto"
            style={{ aspectRatio: '9/16' }}
          />
        </div>
        
        {/* アクションボタン */}
        <div className="p-6 border-t border-gray-200 flex gap-4 justify-center">
          <button 
            onClick={onDownload}
            className="py-3 px-6 border-none rounded-full text-sm font-bold cursor-pointer transition-all duration-300 flex items-center gap-2 bg-indigo-600 text-white hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            ダウンロード
          </button>
          
          <button 
            onClick={onToggleFavorite}
            className={`py-3 px-6 border border-gray-300 rounded-full text-sm font-bold cursor-pointer transition-all duration-300 flex items-center gap-2 ${
              isFavorited 
                ? 'bg-pink-100 text-pink-600 border-pink-200' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current text-pink-600' : 'text-gray-600'}`} />
            {isFavorited ? 'お気に入り解除' : 'お気に入り'}
          </button>
        </div>
      </div>
    </div>
  );
};

// VideoCardコンポーネント - カードUI
const VideoCard: React.FC<{
  video: VideoAsset;
  onClick: () => void;
  isFavorited: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onToggleFavorite: () => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: (categoryId: string) => void;
}> = ({ video, onClick, isFavorited, isDownloading, onDownload, onToggleFavorite, onTagClick, onCategoryClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverVideoRef = useRef<HTMLVideoElement | null>(null);

  const previewSource = video.preview_url || video.file_url;
  const canPreviewPlay = Boolean(previewSource);

  useEffect(() => {
    const el = hoverVideoRef.current;
    if (!el) return;

    if (isHovered && canPreviewPlay) {
      el.currentTime = 0;
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          /* noop: autoplay might be blocked; fallback to static thumbnail */
        });
      }
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [isHovered, canPreviewPlay]);

  useEffect(() => {
    return () => {
      const el = hoverVideoRef.current;
      if (el) {
        el.pause();
        el.currentTime = 0;
      }
    };
  }, []);

  const categoryNames = {
    beauty: '美容',
    fitness: 'フィットネス',
    haircare: 'ヘアケア',
    oralcare: 'オーラルケア',
    business: 'ビジネス',
    lifestyle: 'ライフスタイル',
    romance: 'モテ・恋愛',
    pet: 'ペット'
  } as const;

  const categoryPills = {
    beauty: 'bg-gradient-to-r from-pink-100 via-rose-100 to-white text-black',
    fitness: 'bg-gradient-to-r from-emerald-100 via-green-100 to-white text-black',
    haircare: 'bg-gradient-to-r from-violet-100 via-purple-100 to-white text-black',
    oralcare: 'bg-gradient-to-r from-cyan-100 via-blue-100 to-white text-black',
    business: 'bg-gradient-to-r from-sky-100 via-indigo-100 to-white text-black',
    lifestyle: 'bg-gradient-to-r from-amber-100 via-orange-100 to-white text-black',
    romance: 'bg-gradient-to-r from-rose-100 via-pink-100 to-white text-black',
    pet: 'bg-gradient-to-r from-orange-100 via-amber-100 to-white text-black'
  } as const;

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || Number.isNaN(seconds)) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const durationLabel = formatDuration(video.duration);
  const subCategoryLabel = video.beautySubCategory ? BEAUTY_SUBCATEGORY_DATA[video.beautySubCategory]?.label : undefined;
  const tagList = subCategoryLabel ? [subCategoryLabel, ...(video.tags || [])] : video.tags || [];
  const primaryCategoryLabel = categoryNames[video.category];
  const mobileTagList = tagList
    .filter(tag => typeof tag === 'string' && !tag.includes(':') && tag.toLowerCase() !== video.category)
    .slice(0, 2);

  return (
    <article
      onClick={onClick}
      className="group relative flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_32px_65px_-35px_rgba(15,23,42,0.6)] md:rounded-[28px]"
      onMouseEnter={() => {
        if (canPreviewPlay) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (isHovered) setIsHovered(false);
      }}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[22px] md:rounded-[28px]">
        {canPreviewPlay && (
          <video
            ref={hoverVideoRef}
            src={previewSource}
            muted
            loop
            playsInline
            preload="none"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className={`h-full w-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-105 ${canPreviewPlay ? 'transition-opacity duration-500 ' + (isHovered ? 'opacity-0' : 'opacity-100') : ''}`}
        />

        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-b from-transparent via-black/10 to-black/70 opacity-0 transition-opacity duration-500 md:block md:group-hover:opacity-100" />

        {durationLabel && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white shadow-md md:left-4 md:top-4 md:px-3 md:py-1 md:text-[11px]">
            {durationLabel}
          </span>
        )}

        <div className="absolute top-4 left-4 hidden flex-col gap-2 md:flex">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCategoryClick?.(video.category);
            }}
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold shadow-md ${categoryPills[video.category]}`}
          >
            {categoryNames[video.category]}
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-pressed={isFavorited}
          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-300 hover:scale-105 md:hidden ${
            isFavorited
              ? 'bg-rose-500 text-white border border-rose-400 shadow-rose-200 hover:bg-rose-600'
              : 'border border-white/80 bg-white/95 text-slate-700 hover:text-rose-500'
          }`}
        >
          <Bookmark className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-pressed={isFavorited}
          className={`absolute top-4 right-4 hidden h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 md:flex ${
            isFavorited
              ? 'bg-rose-500 text-white border border-rose-400 shadow-rose-200 hover:bg-rose-600'
              : 'border border-white/70 bg-white/90 text-slate-700 hover:text-rose-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-2 md:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCategoryClick?.(video.category);
            }}
            className="pointer-events-auto inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold text-white shadow"
          >
            {primaryCategoryLabel}
          </button>
          {mobileTagList.map((tag, index) => (
            <button
              key={`${tag}-${index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="pointer-events-auto inline-flex items-center rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow"
            >
              #{tag}
            </button>
          ))}
        </div>

        {isDownloading && <div className="absolute inset-0 bg-white/55" />}
      </div>

      <div className="flex flex-1 flex-col px-4 py-3.5 md:px-5 md:py-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {tagList.slice(0, 3).map((tag, index) => (
            <button
              key={`${tag}-${index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick?.(tag);
              }}
              className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-200"
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300"
          >
            <Eye className="h-3.5 w-3.5" />
            プレビュー
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={isDownloading}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {isDownloading ? (
              <span>取得中...</span>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                ダウンロード
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};


export default Dashboard;
