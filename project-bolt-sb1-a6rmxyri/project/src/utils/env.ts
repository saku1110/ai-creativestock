export const getBaseUrl = (): string => {
  // Prefer explicit env vars if present
  const runtimeEnv: Record<string, any> = (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? (import.meta as any).env
    : (process.env as Record<string, string | undefined>);

  const explicit = runtimeEnv?.VITE_PUBLIC_SITE_URL || runtimeEnv?.PUBLIC_SITE_URL;
  if (explicit && typeof explicit === 'string') return explicit.replace(/\/$/, '');

  // Use browser origin when available
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    // If running on localhost but explicit env is not set, fall back to production domain
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\\d+)?$/.test(origin)) {
      return 'https://ai-creative-stock.com';
    }
    return origin;
  }

  // Final fallback for SSR/build-time
  return 'https://ai-creative-stock.com';
};

