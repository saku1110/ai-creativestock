import { describe, it, expect } from 'vitest';
import {
  detectXSS,
  sanitizeHTML,
  escapeHTML,
  isValidURL,
  sanitizeCSS,
  detectXSSTestPayloads,
  validateFileUpload
} from '../../lib/xssSecurity';

describe('XSS Security', () => {
  describe('detectXSS', () => {
    it('XSS攻撃パターンを検出する', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<body onload=alert("XSS")>',
        'eval(alert("XSS"))',
        'document.cookie',
        'window.location'
      ];

      xssPayloads.forEach(payload => {
        expect(detectXSS(payload)).toBe(true);
      });
    });

    it('正常な入力は検出しない', () => {
      const normalInputs = [
        'Hello World',
        'user@example.com',
        '123-456-7890',
        'This is a normal text with 日本語',
        'https://example.com'
      ];

      normalInputs.forEach(input => {
        expect(detectXSS(input)).toBe(false);
      });
    });
  });

  describe('sanitizeHTML', () => {
    it('危険なHTMLタグを除去する', () => {
      const dangerousHTML = '<script>alert("XSS")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(dangerousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    it('許可されたタグのみ保持する', () => {
      const html = '<p>段落</p><script>alert("XSS")</script><strong>太字</strong>';
      const sanitized = sanitizeHTML(html, {
        allowedTags: ['p', 'strong'],
        allowedAttributes: []
      });
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).not.toContain('<script>');
    });

    it('すべてのタグを除去する（stripTags: true）', () => {
      const html = '<p>段落</p><strong>太字</strong>';
      const sanitized = sanitizeHTML(html, { stripTags: true });
      
      expect(sanitized).toBe('段落太字');
    });
  });

  describe('escapeHTML', () => {
    it('HTML特殊文字をエスケープする', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHTML(input);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('すべての危険文字をエスケープする', () => {
      const input = '&<>"\'`=/';
      const escaped = escapeHTML(input);
      
      expect(escaped).toBe('&amp;&lt;&gt;&quot;&#x27;&#x60;&#x3D;&#x2F;');
    });
  });

  describe('isValidURL', () => {
    it('有効なURLを受け入れる', () => {
      const validURLs = [
        'https://example.com',
        'http://localhost:3000',
        'https://subdomain.example.com/path?param=value#anchor'
      ];

      validURLs.forEach(url => {
        expect(isValidURL(url)).toBe(true);
      });
    });

    it('危険なURLを拒否する', () => {
      const dangerousURLs = [
        'javascript:alert("XSS")',
        'data:text/html,<script>alert("XSS")</script>',
        'vbscript:alert("XSS")',
        'file:///etc/passwd',
        'ftp://example.com'
      ];

      dangerousURLs.forEach(url => {
        expect(isValidURL(url)).toBe(false);
      });
    });
  });

  describe('sanitizeCSS', () => {
    it('危険なCSSプロパティを除去する', () => {
      const dangerousCSS = 'color: red; expression(alert("XSS")); background: url(javascript:alert("XSS"));';
      const sanitized = sanitizeCSS(dangerousCSS);
      
      expect(sanitized).not.toContain('expression');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('color: red');
    });

    it('CSSインポートを除去する', () => {
      const css = '@import url("malicious.css"); color: blue;';
      const sanitized = sanitizeCSS(css);
      
      expect(sanitized).not.toContain('@import');
      expect(sanitized).toContain('color: blue');
    });
  });

  describe('detectXSSTestPayloads', () => {
    it('テスト用XSSペイロードを検出する', () => {
      const testPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>'
      ];

      testPayloads.forEach(payload => {
        expect(detectXSSTestPayloads(payload)).toBe(true);
      });
    });

    it('正常な入力は検出しない', () => {
      const normalInputs = [
        'alert("not XSS")',
        'script tag content',
        'onclick handler description'
      ];

      normalInputs.forEach(input => {
        expect(detectXSSTestPayloads(input)).toBe(false);
      });
    });
  });

  describe('validateFileUpload', () => {
    it('有効なファイルを受け入れる', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(validFile);
      
      expect(result.valid).toBe(true);
    });

    it('大きすぎるファイルを拒否する', () => {
      const largeContent = new Array(101 * 1024 * 1024).fill('a').join(''); // 101MB
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(largeFile);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('ファイルサイズが大きすぎます');
    });

    it('許可されていないファイル形式を拒否する', () => {
      const invalidFile = new File(['content'], 'malware.exe', { type: 'application/exe' });
      const result = validateFileUpload(invalidFile);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('許可されていないファイル形式');
    });

    it('不正なファイル名を拒否する', () => {
      const file = new File(['content'], '<script>alert("XSS")</script>.jpg', { type: 'image/jpeg' });
      const result = validateFileUpload(file);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('ファイル名に不正な文字');
    });
  });
});