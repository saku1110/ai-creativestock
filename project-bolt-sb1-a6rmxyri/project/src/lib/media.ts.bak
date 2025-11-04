export type SignedVideoItem = { path: string; url: string };

export async function fetchSupabaseVideos(params: {
  bucket?: string;
  prefix?: string;
  limit?: number;
  expires?: number;
}): Promise<SignedVideoItem[]> {
  const q = new URLSearchParams();
  if (params.bucket) q.set('bucket', params.bucket);
  if (params.prefix) q.set('prefix', params.prefix);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.expires) q.set('expires', String(params.expires));
  const res = await fetch(`/api/list-videos?${q.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []) as SignedVideoItem[];
}

export type SignedImageItem = { path: string; url: string };

export async function fetchSupabaseImages(params: {
  bucket?: string;
  prefix?: string;
  limit?: number;
  expires?: number;
}): Promise<SignedImageItem[]> {
  const q = new URLSearchParams();
  if (params.bucket) q.set('bucket', params.bucket);
  if (params.prefix) q.set('prefix', params.prefix);
  if (params.limit) q.set('limit', String(params.limit));
  if (params.expires) q.set('expires', String(params.expires));
  const res = await fetch(`/api/list-images?${q.toString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items || []) as SignedImageItem[];
}

export function stem(path: string): string {
  const name = path.split('/').pop() || path;
  return name.replace(/\.[^/.]+$/, '').toLowerCase();
}
