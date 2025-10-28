import { describe, it, expect } from 'vitest';
import {
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  PasswordHistory,
  changePassword,
  hashSecurityAnswer,
  verifySecurityAnswer,
  generatePasswordPolicyText
} from '../../lib/passwordSecurity';

describe('Password Security', () => {
  describe('validatePasswordStrength', () => {
    it('強力なパスワードを受け入れる', () => {
      const strongPasswords = [
        'StrongPass123!',
        'MySecure@Password456',
        'C0mpl3x&Secure#2024'
      ];

      strongPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
        expect(result.score).toBeGreaterThan(70);
      });
    });

    it('弱いパスワードを拒否する', () => {
      const weakPasswords = [
        'password', // よく使われるパスワード
        '123456', // 短すぎる
        'abc', // 短すぎる、複雑さ不足
        'ALLUPPERCASE', // 小文字なし
        'alllowercase', // 大文字なし
        'NoNumbers!', // 数字なし
        'NoSymbols123' // 記号なし
      ];

      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.feedback.length).toBeGreaterThan(0);
      });
    });

    it('パスワード要件をチェックする', () => {
      const result = validatePasswordStrength('TestPass123!');
      
      expect(result.requirements.length).toBe(true);
      expect(result.requirements.uppercase).toBe(true);
      expect(result.requirements.lowercase).toBe(true);
      expect(result.requirements.numbers).toBe(true);
      expect(result.requirements.symbols).toBe(true);
      expect(result.requirements.commonPassword).toBe(true);
    });

    it('連続文字を検出する', () => {
      const result = validatePasswordStrength('Tesssst123!');
      expect(result.feedback.some(fb => fb.includes('連続'))).toBe(true);
    });

    it('null/undefinedを適切に処理する', () => {
      expect(validatePasswordStrength(null as any).isValid).toBe(false);
      expect(validatePasswordStrength(undefined as any).isValid).toBe(false);
      expect(validatePasswordStrength('').isValid).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('有効なパスワードをハッシュ化する', async () => {
      const password = 'StrongPass123!';
      const result = await hashPassword(password);
      
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.algorithm).toBe('bcrypt');
      expect(result.hash).not.toBe(password);
    });

    it('弱いパスワードを拒否する', async () => {
      await expect(hashPassword('weak')).rejects.toThrow('パスワードが要件を満たしていません');
    });

    it('同じパスワードでも異なるハッシュを生成する', async () => {
      const password = 'StrongPass123!';
      const result1 = await hashPassword(password);
      const result2 = await hashPassword(password);
      
      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });
  });

  describe('verifyPassword', () => {
    it('正しいパスワードを認証する', async () => {
      const password = 'StrongPass123!';
      const { hash } = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('間違ったパスワードを拒否する', async () => {
      const password = 'StrongPass123!';
      const wrongPassword = 'WrongPass123!';
      const { hash } = await hashPassword(password);
      
      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('不正なハッシュを処理する', async () => {
      const isValid = await verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('有効なリセットトークンを生成する', () => {
      const tokenData = generatePasswordResetToken();
      
      expect(tokenData.token).toBeDefined();
      expect(tokenData.hashedToken).toBeDefined();
      expect(tokenData.expiresAt).toBeInstanceOf(Date);
      expect(tokenData.token).not.toBe(tokenData.hashedToken);
      expect(tokenData.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('一意のトークンを生成する', () => {
      const token1 = generatePasswordResetToken();
      const token2 = generatePasswordResetToken();
      
      expect(token1.token).not.toBe(token2.token);
      expect(token1.hashedToken).not.toBe(token2.hashedToken);
    });
  });

  describe('verifyPasswordResetToken', () => {
    it('有効なトークンを認証する', async () => {
      const { token, hashedToken, expiresAt } = generatePasswordResetToken();
      
      const isValid = await verifyPasswordResetToken(token, hashedToken, expiresAt);
      expect(isValid).toBe(true);
    });

    it('期限切れトークンを拒否する', async () => {
      const { token, hashedToken } = generatePasswordResetToken();
      const expiredDate = new Date(Date.now() - 1000); // 1秒前
      
      const isValid = await verifyPasswordResetToken(token, hashedToken, expiredDate);
      expect(isValid).toBe(false);
    });

    it('間違ったトークンを拒否する', async () => {
      const { hashedToken, expiresAt } = generatePasswordResetToken();
      const wrongToken = 'wrong-token';
      
      const isValid = await verifyPasswordResetToken(wrongToken, hashedToken, expiresAt);
      expect(isValid).toBe(false);
    });
  });

  describe('PasswordHistory', () => {
    it('新しいパスワードを受け入れる', async () => {
      const newPassword = 'NewStrongPass123!';
      const oldPassword = 'OldStrongPass123!';
      const { hash: oldHash } = await hashPassword(oldPassword);
      
      const isNew = await PasswordHistory.checkPasswordHistory(newPassword, [oldHash]);
      expect(isNew).toBe(true);
    });

    it('過去に使用されたパスワードを拒否する', async () => {
      const password = 'StrongPass123!';
      const { hash } = await hashPassword(password);
      
      const isNew = await PasswordHistory.checkPasswordHistory(password, [hash]);
      expect(isNew).toBe(false);
    });

    it('パスワード履歴を正しく更新する', () => {
      const currentHistory = ['hash1', 'hash2', 'hash3'];
      const newHash = 'newHash';
      
      const updatedHistory = PasswordHistory.updatePasswordHistory(currentHistory, newHash);
      
      expect(updatedHistory[0]).toBe(newHash);
      expect(updatedHistory.length).toBe(4);
    });

    it('履歴の長さを制限する', () => {
      const currentHistory = ['hash1', 'hash2', 'hash3', 'hash4', 'hash5'];
      const newHash = 'newHash';
      
      const updatedHistory = PasswordHistory.updatePasswordHistory(currentHistory, newHash);
      
      expect(updatedHistory.length).toBe(5); // 設定された上限
      expect(updatedHistory[0]).toBe(newHash);
      expect(updatedHistory).not.toContain('hash5'); // 最古のハッシュが除去される
    });
  });

  describe('changePassword', () => {
    it('有効なパスワード変更を処理する', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldStrongPass123!';
      const newPassword = 'NewStrongPass456!';
      const passwordHistory: string[] = [];
      
      const result = await changePassword(userId, currentPassword, newPassword, passwordHistory);
      
      expect(result.success).toBe(true);
      expect(result.newPasswordHash).toBeDefined();
      expect(result.message).toContain('正常に変更されました');
    });

    it('弱い新しいパスワードを拒否する', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldStrongPass123!';
      const newPassword = 'weak';
      const passwordHistory: string[] = [];
      
      const result = await changePassword(userId, currentPassword, newPassword, passwordHistory);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('要件を満たしていません');
    });

    it('過去に使用されたパスワードを拒否する', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldStrongPass123!';
      const newPassword = 'NewStrongPass456!';
      const { hash } = await hashPassword(newPassword);
      const passwordHistory = [hash];
      
      const result = await changePassword(userId, currentPassword, newPassword, passwordHistory);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('過去に使用したパスワード');
    });
  });

  describe('Security Questions', () => {
    it('セキュリティ質問の回答をハッシュ化する', async () => {
      const answer = 'My First Pet Name';
      const hashedAnswer = await hashSecurityAnswer(answer);
      
      expect(hashedAnswer).toBeDefined();
      expect(hashedAnswer).not.toBe(answer);
    });

    it('回答の大文字小文字と空白を正規化する', async () => {
      const answer1 = 'My First Pet Name';
      const answer2 = '  my first pet name  ';
      const answer3 = 'MY FIRST PET NAME';
      
      const hash1 = await hashSecurityAnswer(answer1);
      const hash2 = await hashSecurityAnswer(answer2);
      const hash3 = await hashSecurityAnswer(answer3);
      
      const isValid1 = await verifySecurityAnswer(answer2, hash1);
      const isValid2 = await verifySecurityAnswer(answer3, hash2);
      const isValid3 = await verifySecurityAnswer(answer1, hash3);
      
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      expect(isValid3).toBe(true);
    });

    it('間違った回答を拒否する', async () => {
      const correctAnswer = 'My First Pet Name';
      const wrongAnswer = 'Wrong Answer';
      const hashedAnswer = await hashSecurityAnswer(correctAnswer);
      
      const isValid = await verifySecurityAnswer(wrongAnswer, hashedAnswer);
      expect(isValid).toBe(false);
    });
  });

  describe('generatePasswordPolicyText', () => {
    it('パスワードポリシーテキストを生成する', () => {
      const policyText = generatePasswordPolicyText();
      
      expect(policyText).toContain('8文字以上');
      expect(policyText).toContain('大文字を含む');
      expect(policyText).toContain('小文字を含む');
      expect(policyText).toContain('数字を含む');
      expect(policyText).toContain('記号を含む');
    });
  });
});