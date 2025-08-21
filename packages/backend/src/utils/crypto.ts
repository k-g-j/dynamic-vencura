/**
 * Cryptographic utilities for secure private key storage
 * 
 * Uses AES-256-GCM encryption with PBKDF2 key derivation for maximum security.
 * Each encryption operation generates unique salt and IV to prevent rainbow table attacks.
 * Authentication tags ensure data integrity and prevent tampering.
 */

import crypto from 'crypto';
import { env } from '../config/env';

// Encryption configuration constants
const algorithm = 'aes-256-gcm'; // Authenticated encryption mode
const keyLength = 32; // 256 bits for AES-256
const ivLength = 16; // 128 bits initialization vector
const saltLength = 64; // 512 bits salt for key derivation
const tagLength = 16; // 128 bits authentication tag
const iterations = 100000; // PBKDF2 iteration count (OWASP recommendation)

/**
 * Derives an encryption key from the master password using PBKDF2
 * 
 * @param password - Master encryption password from environment
 * @param salt - Random salt unique to each encryption operation
 * @returns Derived 256-bit encryption key
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
}

/**
 * Encrypts sensitive data (private keys) using AES-256-GCM
 * 
 * Security features:
 * - Unique salt for each encryption prevents rainbow table attacks
 * - Random IV ensures same plaintext produces different ciphertext
 * - Authentication tag prevents tampering and ensures integrity
 * - Base64 encoding for safe database storage
 * 
 * Output format: [salt:64][iv:16][tag:16][ciphertext:variable]
 * 
 * @param text - Plaintext private key to encrypt
 * @returns Base64-encoded encrypted data with embedded salt, IV, and auth tag
 */
export function encrypt(text: string): string {
  // Generate cryptographically secure random salt
  const salt = crypto.randomBytes(saltLength);
  
  // Derive unique encryption key from master password and salt
  const key = deriveKey(env.ENCRYPTION_KEY, salt);
  
  // Generate random initialization vector
  const iv = crypto.randomBytes(ivLength);
  
  // Create cipher with authenticated encryption mode
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  // Encrypt the private key
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  
  // Get authentication tag for integrity verification
  const tag = cipher.getAuthTag();
  
  // Combine all components for storage
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts encrypted private keys from database storage
 * 
 * Extracts components from the combined encrypted data and verifies
 * integrity using the authentication tag before returning plaintext.
 * 
 * @param encryptedText - Base64-encoded encrypted data from database
 * @returns Decrypted private key
 * @throws Error if authentication tag verification fails (data tampered)
 */
export function decrypt(encryptedText: string): string {
  // Decode from base64 storage format
  const combined = Buffer.from(encryptedText, 'base64');
  
  // Extract components from known positions
  const salt = combined.subarray(0, saltLength);
  const iv = combined.subarray(saltLength, saltLength + ivLength);
  const tag = combined.subarray(saltLength + ivLength, saltLength + ivLength + tagLength);
  const encrypted = combined.subarray(saltLength + ivLength + tagLength);
  
  // Derive the same key using stored salt
  const key = deriveKey(env.ENCRYPTION_KEY, salt);
  
  // Create decipher and set authentication tag for verification
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  
  // Decrypt and verify integrity (throws if tag invalid)
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}