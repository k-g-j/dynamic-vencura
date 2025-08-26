import { encrypt, decrypt } from '../crypto';

describe('Crypto Utilities', () => {
  const testPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  
  describe('encrypt', () => {
    it('should encrypt a private key', () => {
      const encrypted = encrypt(testPrivateKey);
      
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(testPrivateKey);
      expect(encrypted.length).toBeGreaterThan(0);
    });
    
    it('should produce different ciphertext for same plaintext', () => {
      const encrypted1 = encrypt(testPrivateKey);
      const encrypted2 = encrypt(testPrivateKey);
      
      expect(encrypted1).not.toBe(encrypted2);
    });
  });
  
  describe('decrypt', () => {
    it('should decrypt an encrypted private key', () => {
      const encrypted = encrypt(testPrivateKey);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(testPrivateKey);
    });
    
    it('should handle multiple encryption/decryption cycles', () => {
      for (let i = 0; i < 5; i++) {
        const encrypted = encrypt(testPrivateKey);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(testPrivateKey);
      }
    });
    
    it('should throw error for invalid encrypted text', () => {
      expect(() => decrypt('invalid-base64')).toThrow();
    });
    
    it('should throw error for tampered data', () => {
      const encrypted = encrypt(testPrivateKey);
      const tampered = encrypted.slice(0, -4) + 'XXXX';
      
      expect(() => decrypt(tampered)).toThrow();
    });
  });
  
  describe('Security', () => {
    it('should use sufficient encryption strength', () => {
      const encrypted = encrypt(testPrivateKey);
      const buffer = Buffer.from(encrypted, 'base64');
      
      // Check minimum length (salt + iv + tag + encrypted data)
      expect(buffer.length).toBeGreaterThanOrEqual(96 + testPrivateKey.length);
    });
    
    it('should include authentication tag', () => {
      const encrypted = encrypt(testPrivateKey);
      const buffer = Buffer.from(encrypted, 'base64');
      
      // Authentication tag is 16 bytes starting at position 80
      const tag = buffer.subarray(80, 96);
      expect(tag.length).toBe(16);
    });
  });
});