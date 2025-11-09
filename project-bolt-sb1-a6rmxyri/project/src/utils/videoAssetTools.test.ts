import { describe, expect, it } from 'vitest';
import { assetsMatchByFilename, dedupeVideoAssets, getAssetBasename, sanitizeTags, type VideoAssetLike } from './videoAssetTools';

const buildVideo = (overrides: Partial<VideoAssetLike> = {}): VideoAssetLike => ({
  id: 'video-1',
  title: 'Sample Clip',
  description: 'A simple sample clip.',
  category: 'lifestyle',
  tags: ['Beauty'],
  duration: 30,
  resolution: '1080x1920',
  file_url: 'https://example.com/storage/v1/object/sign/video-assets/videos/lifestyle/sample-clip.mp4?token=abc',
  thumbnail_url: 'https://example.com/storage/v1/object/sign/video-assets/thumbnails/lifestyle/sample-clip.jpg',
  download_count: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides
});

describe('sanitizeTags', () => {
  it('removes banned or duplicate tags and preserves casing', () => {
    const result = sanitizeTags(['  Beauty  ', 'NSFW', 'セクシー', '#Trend', 'beauty', 'えっち']);
    expect(result).toEqual(['Beauty', '#Trend']);
  });
});

describe('getAssetBasename / assetsMatchByFilename', () => {
  it('normalizes file keys across encoded URLs', () => {
    expect(getAssetBasename('https://example.com/videos/lifestyle/foo.mp4?token=abc')).toBe('foo');
    expect(getAssetBasename('videos%2Flifestyle%2Fbar.MP4')).toBe('bar');
    expect(assetsMatchByFilename('https://example.com/videos/foo.mp4', 'https://cdn.test/thumbnails/foo.jpg')).toBe(true);
    expect(assetsMatchByFilename('foo.mp4', 'bar.jpg')).toBe(false);
  });
});

describe('dedupeVideoAssets', () => {
  it('merges videos that share the same file path even if ids differ', () => {
    const first = buildVideo({
      id: 'a',
      category: 'lifestyle',
      tags: ['Beauty', 'NSFW']
    });
    const second = buildVideo({
      id: 'b',
      category: 'beauty',
      description: 'Updated description',
      is_featured: true,
      download_count: 5,
      created_at: '2024-02-10T00:00:00.000Z'
    });

    const result = dedupeVideoAssets([first, second]);
    expect(result).toHaveLength(1);
    const merged = result[0];
    expect(merged.id).toBeTruthy();
    expect(merged.category).toBe('beauty');
    expect(merged.download_count).toBe(5);
    expect(merged.is_featured).toBe(true);
    expect(merged.created_at).toBe('2024-02-10T00:00:00.000Z');
    expect(merged.tags).toEqual(['Beauty']);
  });

  it('merges videos that only share thumbnail/title fingerprints', () => {
    const first = buildVideo({
      id: 'thumb-only-1',
      file_url: undefined,
      thumbnail_url: 'https://cdn.example.com/thumbnails/beauty/shared-thumb.jpg',
      preview_url: 'https://cdn.example.com/previews/beauty/shared-thumb.jpg',
      download_count: 2
    });
    const second = buildVideo({
      id: 'thumb-only-2',
      file_url: undefined,
      thumbnail_url: 'https://cdn.example.com/other/thumbnails/shared-thumb.jpg?token=123',
      title: 'Sample Clip ', // trailing whitespace should normalize
      download_count: 4
    });

    const result = dedupeVideoAssets([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0].download_count).toBe(4);
    expect(result[0].thumbnail_url).toContain('shared-thumb.jpg');
  });
});
