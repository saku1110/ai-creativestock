const sanitizeExtension = (ext?: string) => {
  if (!ext) return 'mp4';
  return ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'mp4';
};

const extractExtensionFromSource = (source?: string) => {
  if (!source) return undefined;
  try {
    const url = new URL(source, typeof window !== 'undefined' ? window.location.origin : 'https://localhost');
    const pathname = url.pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      return sanitizeExtension(match[1]);
    }
  } catch {
    const sanitized = source.split('?')[0] ?? '';
    const match = sanitized.match(/\.([a-zA-Z0-9]+)$/);
    if (match) {
      return sanitizeExtension(match[1]);
    }
  }
  return undefined;
};

const randomToken = () => {
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
      }
      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(12);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch {
    // ignore crypto errors and fall back to math random
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const timestampPart = Date.now().toString(36);
  return `${timestampPart}${randomPart}`;
};

export const getNextDownloadFilename = (source?: string, fallbackExtension = 'mp4') => {
  const extension = sanitizeExtension(extractExtensionFromSource(source) ?? fallbackExtension);
  const token = randomToken();
  return `aicreativestock-${token}.${extension}`;
};
