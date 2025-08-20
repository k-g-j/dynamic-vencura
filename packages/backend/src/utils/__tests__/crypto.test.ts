/**
 * Unit tests for crypto utilities
 */

import { encrypt, decrypt } from '../crypto';

describe('Crypto utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const originalText = 'This is a secret message';
      
      const encrypted = encrypt(originalText);
      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toBeTruthy();
      expect(typeof encrypted).toBe('string');
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted values for same input', () => {
      const originalText = 'Test message';
      
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });

    it('should handle special characters', () => {
      const originalText = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle unicode characters', () => {
      const originalText = '😀🎉🚀 Unicode test 测试';
      
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty string', () => {
      const originalText = '';
      
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle very long strings', () => {
      const originalText = 'a'.repeat(10000);
      
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should throw error for invalid encrypted text', () => {
      expect(() => decrypt('invalid-base64')).toThrow();
    });

    it('should throw error for tampered encrypted text', () => {
      const originalText = 'Secret message';
      const encrypted = encrypt(originalText);
      
      const tampered = encrypted.slice(0, -10) + 'tampered';
      
      expect(() => decrypt(tampered)).toThrow();
    });
  });
});