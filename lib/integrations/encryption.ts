/**
 * Credential Encryption Helpers
 * Encrypts/decrypts integration credentials before storing in database
 */

import crypto from "crypto";

// AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, "sha256");
}

/**
 * Get encryption password from environment
 */
function getEncryptionPassword(): string {
  const password = process.env.ENCRYPTION_KEY;
  if (!password) {
    throw new Error(
      "ENCRYPTION_KEY environment variable not set. Generate with: openssl rand -hex 32"
    );
  }
  return password;
}

/**
 * Encrypt credentials object
 * @param credentials - Plain credentials object
 * @returns Encrypted string that can be stored in database
 */
export function encryptCredentials(credentials: any): string {
  try {
    const password = getEncryptionPassword();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const plaintext = JSON.stringify(credentials);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    const result = {
      salt: salt.toString("hex"),
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
      encrypted,
    };

    return JSON.stringify(result);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt credentials");
  }
}

/**
 * Decrypt credentials string
 * @param encryptedData - Encrypted string from database
 * @returns Plain credentials object
 */
export function decryptCredentials(encryptedData: string): any {
  try {
    const password = getEncryptionPassword();
    const data = JSON.parse(encryptedData);

    const salt = Buffer.from(data.salt, "hex");
    const iv = Buffer.from(data.iv, "hex");
    const authTag = Buffer.from(data.authTag, "hex");
    const encrypted = data.encrypted;

    const key = deriveKey(password, salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt credentials");
  }
}

/**
 * Check if data is encrypted (has expected structure)
 */
export function isEncrypted(data: any): boolean {
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return !!(parsed.salt && parsed.iv && parsed.authTag && parsed.encrypted);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Safely decrypt credentials, handling both encrypted and plain formats
 * Used during transition period when migrating existing integrations
 */
export function safeDecryptCredentials(data: any): any {
  if (!data) return null;

  // If already an object (not encrypted), return as-is
  if (typeof data === "object" && !isEncrypted(JSON.stringify(data))) {
    return data;
  }

  // If string, try to decrypt
  if (typeof data === "string") {
    if (isEncrypted(data)) {
      return decryptCredentials(data);
    }
    // Try parsing as JSON
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
}
