import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // セキュリティヘッダーを自動的に追加するプラグイン
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 開発環境用のセキュリティヘッダー
          const devHeaders = {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https: ws: wss:; frame-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          };
          
          Object.entries(devHeaders).forEach(([name, value]) => {
            if (!res.headersSent) {
              res.setHeader(name, value);
            }
          });
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          // プレビュー環境用のより厳格なヘッダー
          const previewHeaders = {
            'Content-Security-Policy': "default-src 'self'; script-src 'self' https://js.stripe.com https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src 'self' https://js.stripe.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          };
          
          Object.entries(previewHeaders).forEach(([name, value]) => {
            if (!res.headersSent) {
              res.setHeader(name, value);
            }
          });
          next();
        });
      }
    }
  ],
  // バンドル最適化設定
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        // コード分割の設定
        manualChunks: {
          // React関連
          'react-vendor': ['react', 'react-dom'],
          // Supabase関連
          'supabase-vendor': ['@supabase/supabase-js'],
          // Stripe関連
          'stripe-vendor': ['@stripe/stripe-js'],
          // UI関連
          'ui-vendor': ['lucide-react'],
          // 大きなコンポーネント
          'dashboard': ['src/components/Dashboard.tsx'],
          'admin': ['src/components/AdminUpload.tsx'],
        },
        // ファイル名の最適化
        chunkFileNames: (chunkInfo) => {
          if (chunkInfo.name.includes('vendor')) {
            return 'assets/vendor/[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(extType ?? '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 600
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom', '@supabase/supabase-js', '@stripe/stripe-js']
  },
  // セキュリティ設定
  server: {
    headers: {
      // 基本的なセキュリティヘッダー
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  preview: {
    headers: {
      // プレビューでも同様のセキュリティヘッダーを適用
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache'
    }
  }
});
