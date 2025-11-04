import { describe, it, expect, vi } from 'vitest';
import { detectSQLInjection, SecureSupabaseClient } from '../../lib/sqlSecurity';

// Supabaseクライアントのモック
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{}], error: null }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [{}], error: null }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

describe('SQL Security', () => {
  describe('detectSQLInjection', () => {
    it('SQLインジェクション攻撃を検出する', () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "; DELETE FROM products;",
        "'; INSERT INTO admin (user) VALUES ('hacker'); --",
        "' OR 1=1 --",
        "admin'--",
        "admin'/*",
        "' OR 'x'='x",
        "'; EXEC xp_cmdshell('dir'); --"
      ];

      sqlInjectionPayloads.forEach(payload => {
        expect(detectSQLInjection(payload)).toBe(true);
      });
    });

    it('正常な入力は検出しない', () => {
      const normalInputs = [
        'user@example.com',
        'John Doe',
        'プロダクト名',
        '123-456-7890',
        'This is a normal description',
        'Product Category A'
      ];

      normalInputs.forEach(input => {
        expect(detectSQLInjection(input)).toBe(false);
      });
    });

    it('大文字小文字を区別しない検出', () => {
      const mixedCasePayloads = [
        "' or '1'='1",
        "' OR '1'='1",
        "' Or '1'='1",
        "; drop table users;",
        "; DROP TABLE users;",
        "; Drop Table users;"
      ];

      mixedCasePayloads.forEach(payload => {
        expect(detectSQLInjection(payload)).toBe(true);
      });
    });

    it('URLエンコードされた攻撃を検出する', () => {
      const encodedPayloads = [
        "%27%20OR%20%271%27%3D%271", // ' OR '1'='1
        "%27%20UNION%20SELECT", // ' UNION SELECT
        "%3B%20DROP%20TABLE" // ; DROP TABLE
      ];

      encodedPayloads.forEach(payload => {
        const decoded = decodeURIComponent(payload);
        expect(detectSQLInjection(decoded)).toBe(true);
      });
    });
  });

  describe('SecureSupabaseClient', () => {
    describe('safeSearch', () => {
      it('正常な検索クエリを実行する', async () => {
        const result = await SecureSupabaseClient.safeSearch(
          'products',
          'name',
          'テスト商品'
        );
        
        expect(result).toBeDefined();
      });

      it('SQLインジェクションを含む検索語を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeSearch(
            'products',
            'name',
            "'; DROP TABLE products; --"
          )
        ).rejects.toThrow('不正な文字が検出されました');
      });

      it('不正なテーブル名を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeSearch(
            "users; DROP TABLE products; --",
            'name',
            'test'
          )
        ).rejects.toThrow('不正なテーブル名またはカラム名');
      });

      it('不正なカラム名を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeSearch(
            'products',
            "name'; DROP TABLE products; --",
            'test'
          )
        ).rejects.toThrow('不正なテーブル名またはカラム名');
      });

      it('追加フィルターの不正な値を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeSearch(
            'products',
            'name',
            'test',
            { 'category': "'; DROP TABLE products; --" }
          )
        ).rejects.toThrow('追加フィルターに不正な値が含まれています');
      });
    });

    describe('safeInsert', () => {
      it('正常なデータ挿入を実行する', async () => {
        const data = {
          name: 'テスト商品',
          description: '商品の説明',
          price: 1000
        };

        const result = await SecureSupabaseClient.safeInsert('products', data);
        expect(result).toBeDefined();
      });

      it('不正なテーブル名を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeInsert(
            "products'; DROP TABLE users; --",
            { name: 'test' }
          )
        ).rejects.toThrow('不正なテーブル名');
      });

      it('不正なデータを拒否する', async () => {
        const maliciousData = {
          name: "'; DROP TABLE products; --",
          description: 'normal description'
        };

        await expect(
          SecureSupabaseClient.safeInsert('products', maliciousData)
        ).rejects.toThrow('不正な値が検出されました');
      });
    });

    describe('safeUpdate', () => {
      it('正常なデータ更新を実行する', async () => {
        const data = { name: '更新された商品名' };
        const conditions = { id: 1 };

        const result = await SecureSupabaseClient.safeUpdate('products', data, conditions);
        expect(result).toBeDefined();
      });

      it('不正な更新データを拒否する', async () => {
        const maliciousData = { name: "'; DROP TABLE products; --" };
        const conditions = { id: 1 };

        await expect(
          SecureSupabaseClient.safeUpdate('products', maliciousData, conditions)
        ).rejects.toThrow('不正な値が検出されました');
      });

      it('不正な条件を拒否する', async () => {
        const data = { name: '正常な名前' };
        const maliciousConditions = { id: "1'; DROP TABLE products; --" };

        await expect(
          SecureSupabaseClient.safeUpdate('products', data, maliciousConditions)
        ).rejects.toThrow('不正な値が検出されました');
      });
    });

    describe('safeDelete', () => {
      it('正常なデータ削除を実行する', async () => {
        const conditions = { id: 1 };

        const result = await SecureSupabaseClient.safeDelete('products', conditions);
        expect(result).toBeDefined();
      });

      it('空の削除条件を拒否する', async () => {
        await expect(
          SecureSupabaseClient.safeDelete('products', {})
        ).rejects.toThrow('削除条件が指定されていません');
      });

      it('不正な削除条件を拒否する', async () => {
        const maliciousConditions = { id: "1'; DROP TABLE products; --" };

        await expect(
          SecureSupabaseClient.safeDelete('products', maliciousConditions)
        ).rejects.toThrow('不正な値が検出されました');
      });
    });

    describe('データサニタイゼーション', () => {
      it('文字列データを適切にサニタイズする', async () => {
        const data = {
          name: 'Product <script>alert("xss")</script>',
          description: 'Description with "quotes" and \'apostrophes\'',
          category: 'Electronics'
        };

        // この場合、HTMLタグやクォートが除去される
        const result = await SecureSupabaseClient.safeInsert('products', data);
        expect(result).toBeDefined();
      });

      it('ネストされたオブジェクトをサニタイズする', async () => {
        const data = {
          product: {
            name: 'Test Product',
            metadata: {
              description: 'Safe description'
            }
          }
        };

        const result = await SecureSupabaseClient.safeInsert('products', data);
        expect(result).toBeDefined();
      });

      it('配列データをサニタイズする', async () => {
        const data = {
          tags: ['tag1', 'tag2', 'safe tag'],
          categories: ['category1', 'category2']
        };

        const result = await SecureSupabaseClient.safeInsert('products', data);
        expect(result).toBeDefined();
      });
    });
  });
});