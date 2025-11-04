Brand watermark assets

- Place your watermark image files in this folder.
- Default path used by the auto upload watcher:
  - ./brand/watermark-9x16.png
- You can override at runtime with:
  - node scripts/watch-uploads.js --wm-image ./brand/watermark-9x16.png --wm-opacity 0.85

Notes
- The system supports either a full-frame PNG overlay (recommended for 9:16) or a text pattern.
- When an image path is set via WATERMARK_IMAGE_PATH, the image overlay is applied to both the video and generated thumbnails.

