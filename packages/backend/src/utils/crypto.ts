import crypto from 'crypto';
import { env } from '../config/env';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const saltLength = 64;
const tagLength = 16;
const iterations = 100000;

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
}

export function encrypt(text: string): string {
  const salt = crypto.randomBytes(saltLength);
  const key = deriveKey(env.ENCRYPTION_KEY, salt);
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);
  
  const tag = cipher.getAuthTag();
  
  const combined = Buffer.concat([salt, iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decrypt(encryptedText: string): string {
  const combined = Buffer.from(encryptedText, 'base64');
  
  const salt = combined.subarray(0, saltLength);
  const iv = combined.subarray(saltLength, saltLength + ivLength);
  const tag = combined.subarray(saltLength + ivLength, saltLength + ivLength + tagLength);
  const encrypted = combined.subarray(saltLength + ivLength + tagLength);
  
  const key = deriveKey(env.ENCRYPTION_KEY, salt);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}