import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { generateBreadcrumbs } from '../utils/seoUtils';

interface BreadcrumbsProps {
  pathname: string;
  className?: string;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ pathname, className = '' }) => {
  const breadcrumbs = generateBreadcrumbs(pathname);

  if (breadcrumbs.length <= 1) {
    return null; // ホームページのみの場合は表示しない
  }

  return (
    <nav 
      className={`flex items-center space-x-2 text-sm text-gray-400 ${className}`}
      aria-label="パンくずリスト"
    >
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.url}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
          {index === breadcrumbs.length - 1 ? (
            // 現在のページ（リンクなし）
            <span 
              className="text-white font-medium"
              aria-current="page"
            >
              {index === 0 ? (
                <Home className="w-4 h-4" />
              ) : (
                breadcrumb.name
              )}
            </span>
          ) : (
            // リンクのあるページ
            <a
              href={breadcrumb.url}
              className="hover:text-cyan-400 transition-colors flex items-center"
              onClick={(e) => {
                e.preventDefault();
                // ここでルーティング処理を実装
                window.history.pushState(null, '', breadcrumb.url);
              }}
            >
              {index === 0 ? (
                <Home className="w-4 h-4" />
              ) : (
                breadcrumb.name
              )}
            </a>
          )}
        </React.Fragment>
      ))}
      
      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((breadcrumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: breadcrumb.name,
              item: `https://ai-creative-stock.com${breadcrumb.url}`
            }))
          })
        }}
      />
    </nav>
  );
};

export default Breadcrumbs;