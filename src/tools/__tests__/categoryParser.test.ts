import { describe, it, expect } from 'vitest';
import { extractCategory } from '../../tools/supa-upload';

describe('extractCategory', () => {
  it('extracts from filename (regex default)', () => {
    const cat = extractCategory('/tmp/Beauty_summer.mp4', 'Beauty_summer.mp4', 'regex');
    expect(cat).toBe('Beauty');
  });

  it('extracts from filename with custom regex and named group', () => {
    const cat = extractCategory('/tmp/skin-care-video.mp4', 'skin-care-video.mp4', 'regex', '^(?<category>[^-]+)-');
    expect(cat).toBe('skin');
  });

  it('falls back to uncategorized when no match', () => {
    const cat = extractCategory('/tmp/video.mp4', 'video.mp4', 'regex');
    expect(cat).toBe('uncategorized');
  });

  it('extracts from dir when scheme=dir', () => {
    const cat = extractCategory('/root/Beauty/video1.mp4', 'Beauty/video1.mp4', 'dir');
    expect(cat).toBe('Beauty');
  });
});

