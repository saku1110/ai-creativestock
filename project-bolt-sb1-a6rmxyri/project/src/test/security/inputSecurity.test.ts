import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  InputType,
  sanitizeObject,
  sanitizeFormData,
  useInputSanitization,
  getInputStatistics
} from '../../lib/inputSecurity';

describe('Input Security', () => {
  describe('sanitizeInput', () => {
    describe('TEXT type', () => {
      it('正常なテキストを処理する', () => {
        const result = sanitizeInput('Hello World', InputType.TEXT);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe('Hello World');
        expect(result.errors).toHaveLength(0);
      });

      it('HTMLタグを除去する', () => {
        const result = sanitizeInput('<script>alert("XSS")</script>Hello', InputType.TEXT);
        
        expect(result.sanitizedValue).not.toContain('<script>');
        expect(result.warnings).toContain('HTMLタグが検出され、除去されました');
      });

      it('前後の空白をトリムする', () => {
        const result = sanitizeInput('  Hello World  ', InputType.TEXT);
        
        expect(result.sanitizedValue).toBe('Hello World');
      });

      it('最大長を制限する', () => {
        const longText = 'a'.repeat(1500);
        const result = sanitizeInput(longText, InputType.TEXT);
        
        expect(result.sanitizedValue.length).toBe(1000);
        expect(result.warnings).toContain('入力値が最大長(1000)を超えています');
      });
    });

    describe('EMAIL type', () => {
      it('有効なメールアドレスを処理する', () => {
        const result = sanitizeInput('user@example.com', InputType.EMAIL);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe('user@example.com');
      });

      it('無効なメールアドレスを拒否する', () => {
        const result = sanitizeInput('invalid-email', InputType.EMAIL);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('有効なメールアドレス形式ではありません');
      });

      it('メールアドレスを小文字に変換する', () => {
        const result = sanitizeInput('USER@EXAMPLE.COM', InputType.EMAIL);
        
        expect(result.sanitizedValue).toBe('user@example.com');
      });

      it('不正な文字を除去する', () => {
        const result = sanitizeInput('user<script>@example.com', InputType.EMAIL);
        
        expect(result.sanitizedValue).toBe('user@example.com');
      });
    });

    describe('PASSWORD type', () => {
      it('パスワードの空白をトリムしない', () => {
        const result = sanitizeInput(' password ', InputType.PASSWORD);
        
        expect(result.sanitizedValue).toBe(' password ');
      });

      it('改行を除去する', () => {
        const result = sanitizeInput('pass\nword\r\n', InputType.PASSWORD);
        
        expect(result.sanitizedValue).toBe('pass word ');
      });
    });

    describe('URL type', () => {
      it('有効なURLを処理する', () => {
        const result = sanitizeInput('https://example.com', InputType.URL);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe('https://example.com');
      });

      it('無効なURLを拒否する', () => {
        const result = sanitizeInput('not-a-url', InputType.URL);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('有効なURL形式ではありません');
      });

      it('URLを小文字に変換する', () => {
        const result = sanitizeInput('HTTPS://EXAMPLE.COM', InputType.URL);
        
        expect(result.sanitizedValue).toBe('https://example.com');
      });
    });

    describe('PHONE type', () => {
      it('有効な電話番号を処理する', () => {
        const validPhones = [
          '090-1234-5678',
          '+81-90-1234-5678',
          '0312345678'
        ];

        validPhones.forEach(phone => {
          const result = sanitizeInput(phone, InputType.PHONE);
          expect(result.isValid).toBe(true);
        });
      });

      it('無効な電話番号を拒否する', () => {
        const result = sanitizeInput('invalid-phone', InputType.PHONE);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('有効な電話番号形式ではありません');
      });

      it('電話番号から不正な文字を除去する', () => {
        const result = sanitizeInput('090-1234-5678abc', InputType.PHONE);
        
        expect(result.sanitizedValue).toBe('090-1234-5678');
      });
    });

    describe('NAME type', () => {
      it('日本語の名前を処理する', () => {
        const result = sanitizeInput('田中太郎', InputType.NAME);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe('田中太郎');
      });

      it('英語の名前を処理する', () => {
        const result = sanitizeInput("John O'Connor", InputType.NAME);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe("John O'Connor");
      });

      it('不正な文字を除去する', () => {
        const result = sanitizeInput('John<script>Doe123', InputType.NAME);
        
        expect(result.sanitizedValue).toBe('JohnDoe');
      });
    });

    describe('FILENAME type', () => {
      it('正常なファイル名を処理する', () => {
        const result = sanitizeInput('document.pdf', InputType.FILENAME);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe('document.pdf');
      });

      it('危険な文字を置換する', () => {
        const result = sanitizeInput('file<>name.txt', InputType.FILENAME);
        
        expect(result.sanitizedValue).toBe('file__name.txt');
      });

      it('パス区切り文字を置換する', () => {
        const result = sanitizeInput('../../../etc/passwd', InputType.FILENAME);
        
        expect(result.sanitizedValue).toBe('______etc_passwd');
      });
    });

    describe('NUMBER type', () => {
      it('有効な数値を処理する', () => {
        const validNumbers = ['123', '123.45', '-123', '0'];

        validNumbers.forEach(num => {
          const result = sanitizeInput(num, InputType.NUMBER);
          expect(result.isValid).toBe(true);
        });
      });

      it('無効な数値を拒否する', () => {
        const result = sanitizeInput('not-a-number', InputType.NUMBER);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('有効な数値形式ではありません');
      });

      it('数値以外の文字を除去する', () => {
        const result = sanitizeInput('123abc456', InputType.NUMBER);
        
        expect(result.sanitizedValue).toBe('123456');
      });
    });

    describe('JSON type', () => {
      it('有効なJSONを処理する', () => {
        const validJSON = '{"name": "value"}';
        const result = sanitizeInput(validJSON, InputType.JSON);
        
        expect(result.isValid).toBe(true);
        expect(result.sanitizedValue).toBe(validJSON);
      });

      it('無効なJSONを拒否する', () => {
        const result = sanitizeInput('{invalid json}', InputType.JSON);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('有効なJSON形式ではありません');
      });
    });

    describe('セキュリティ脅威の検出', () => {
      it('XSS攻撃を検出する', () => {
        const result = sanitizeInput('<script>alert("XSS")</script>', InputType.TEXT);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('XSS攻撃パターンが検出されました');
      });

      it('SQLインジェクション攻撃を検出する', () => {
        const result = sanitizeInput("'; DROP TABLE users; --", InputType.TEXT);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('SQLインジェクション攻撃パターンが検出されました');
      });
    });

    describe('エラー処理', () => {
      it('null入力を処理する', () => {
        const result = sanitizeInput(null as any, InputType.TEXT);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('入力値が null または undefined です');
      });

      it('undefined入力を処理する', () => {
        const result = sanitizeInput(undefined as any, InputType.TEXT);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('入力値が null または undefined です');
      });

      it('非文字列入力を文字列に変換する', () => {
        const result = sanitizeInput(123 as any, InputType.TEXT);
        
        expect(result.sanitizedValue).toBe('123');
        expect(result.warnings).toContain('入力値を文字列に変換しました');
      });
    });
  });

  describe('sanitizeObject', () => {
    it('オブジェクトのフィールドを一括サニタイズする', () => {
      const obj = {
        email: 'USER@EXAMPLE.COM',
        name: 'John<script>Doe',
        phone: '090-1234-5678abc',
        description: 'Normal description'
      };

      const typeMapping = {
        email: InputType.EMAIL,
        name: InputType.NAME,
        phone: InputType.PHONE,
        description: InputType.TEXT
      };

      const result = sanitizeObject(obj, typeMapping);

      expect(result.sanitizedObject.email).toBe('user@example.com');
      expect(result.sanitizedObject.name).toBe('JohnDoe');
      expect(result.sanitizedObject.phone).toBe('090-1234-5678');
      expect(result.sanitizedObject.description).toBe('Normal description');
    });

    it('バリデーションエラーを集約する', () => {
      const obj = {
        email: 'invalid-email',
        phone: 'invalid-phone'
      };

      const typeMapping = {
        email: InputType.EMAIL,
        phone: InputType.PHONE
      };

      const result = sanitizeObject(obj, typeMapping);

      expect(result.isValid).toBe(false);
      expect(result.validationResults.email.isValid).toBe(false);
      expect(result.validationResults.phone.isValid).toBe(false);
    });
  });

  describe('useInputSanitization', () => {
    it('フックが正しく動作する', () => {
      const { sanitize, validateAndSanitize, getConfig } = useInputSanitization(InputType.EMAIL);

      const result = sanitize('USER@EXAMPLE.COM');
      expect(result.sanitizedValue).toBe('user@example.com');

      const sanitizedValue = validateAndSanitize('user@example.com');
      expect(sanitizedValue).toBe('user@example.com');

      const config = getConfig();
      expect(config.toLowerCase).toBe(true);
    });

    it('無効な入力で例外を投げる', () => {
      const { validateAndSanitize } = useInputSanitization(InputType.EMAIL);

      expect(() => {
        validateAndSanitize('invalid-email');
      }).toThrow('有効なメールアドレス形式ではありません');
    });
  });

  describe('getInputStatistics', () => {
    it('入力統計を正しく計算する', () => {
      const results = {
        field1: {
          isValid: true,
          sanitizedValue: 'value1',
          errors: [],
          warnings: ['warning1'],
          originalLength: 10,
          finalLength: 6
        },
        field2: {
          isValid: false,
          sanitizedValue: 'value2',
          errors: ['error1', 'error2'],
          warnings: [],
          originalLength: 5,
          finalLength: 5
        }
      };

      const stats = getInputStatistics(results);

      expect(stats.totalFields).toBe(2);
      expect(stats.validFields).toBe(1);
      expect(stats.invalidFields).toBe(1);
      expect(stats.fieldsWithWarnings).toBe(1);
      expect(stats.totalErrors).toBe(2);
      expect(stats.totalWarnings).toBe(1);
      expect(stats.avgCompressionRatio).toBeCloseTo(0.8); // (0.6 + 1.0) / 2
    });
  });
});