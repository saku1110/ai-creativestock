import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import Sidebar from './Sidebar';
import { useUser } from '../hooks/useUser';
import { supabase } from '../lib/supabase';
import { getNextDownloadFilename } from '../utils/downloadFilename';
import { convertToOriginalUrl } from '../lib/downloadLimits';

interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: 'beauty' | 'diet' | 'healthcare' | 'business' | 'lifestyle' | 'romance';
  tags: string[];
  duration: number;
  resolution: string;
  file_url: string;
  thumbnail_url: string;
  download_count: number;
}

interface DownloadRecord {
  id: string;
  video_id: string;
  downloaded_at: string;
  ip_address?: string;
  user_agent?: string;
  video: VideoAsset;
}

interface DownloadHistoryProps {
  onPageChange?: (page: string) => void;
}

const DownloadHistory: React.FC<DownloadHistoryProps> = ({ onPageChange = () => {} }) => {
  const { user, hasActiveSubscription, loading: userLoading } = useUser();
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) {
      setDownloads([]);
      setLoading(false);
      return;
    }

    void fetchDownloadHistory();
  }, [user]);

  const fetchDownloadHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('download_history')
        .select(
          `
            *,
            video:video_assets(*)
          `
        )
        .eq('user_id', user.id)
        .order('downloaded_at', { ascending: false });

      if (error) {
        console.error('Download history fetch error:', error);
        return;
      }

      setDownloads((data || []).filter((record) => Boolean(record.video)) as DownloadRecord[]);
    } catch (err) {
      console.error('Download history error:', err);
    } finally {
      setLoading(false);
    }
  };

  const redownload = (record: DownloadRecord) => {
    if (!hasActiveSubscription) {
      alert('ダウンロードには有料プランが必要です。');
      return;
    }

    if (!record.video?.file_url) {
      alert('ダウンロードファイルが見つかりません。');
      return;
    }

    try {
      const originalUrl = convertToOriginalUrl(record.video.file_url);
      const link = document.createElement('a');
      link.href = originalUrl;
      link.download = getNextDownloadFilename(originalUrl);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Redownload error:', err);
      alert('ダウンロードに失敗しました。時間をおいて再試行してください。');
    }
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">ダウンロード履歴を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-gray-400">このページを表示するにはログインが必要です。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Sidebar currentPage="downloads" onPageChange={onPageChange} />
      <div className="ml-0 lg:ml-[260px] px-4 py-8 lg:px-10">
        <div className="max-w-7xl mx-auto space-y-8">
          <header>
            <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              Download History
            </p>
            <h1 className="text-3xl font-black">ダウンロード履歴</h1>
          </header>

          {downloads.length === 0 ? (
            <div className="border border-dashed border-white/20 rounded-3xl py-16 text-center text-gray-400">
              ダウンロード履歴がありません。
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {downloads.map((record) => (
                <div key={record.id} className="group relative">
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-gray-900 to-black rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 hover-lift">
                    <img
                      src={record.video.thumbnail_url}
                      alt={record.video.title}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="text-white text-sm font-medium truncate">{record.video.title}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => redownload(record)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <div className="glass-effect hover:bg-white/20 rounded-full p-3 sm:p-4 border border-cyan-400/30">
                        <Download className="w-5 h-5 text-cyan-400" />
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadHistory;
