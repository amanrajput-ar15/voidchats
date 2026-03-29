// lib/storage/encryption.ts

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
// PRODUCTION SECURITY UPGRADE: OWASP recommends 600,000 iterations for PBKDF2-HMAC-SHA256 in modern systems.
// 100,000 is vulnerable to hardware acceleration brute-forcing.
const KEY_ITERATIONS = 600_000; 

/**
 * Derives an AES-256-GCM key from a passphrase using PBKDF2.
 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // FIX: Cast salt to BufferSource to satisfy strict memory type checks
      salt: salt as BufferSource, 
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * Returns ciphertext, IV, and salt — all needed for decryption.
 * IV must be unique per encryption — generated randomly here.
 */
export async function encrypt(
  plaintext: string,
  passphrase: string
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; salt: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    // FIX: Cast iv to BufferSource
    { name: 'AES-GCM', iv: iv as BufferSource }, 
    key,
    encoder.encode(plaintext)
  );

  return { ciphertext, iv, salt };
}

/**
 * Decrypts AES-GCM ciphertext.
 * Throws if passphrase is wrong or data was tampered with.
 * This is the authentication guarantee of AES-GCM.
 */
export async function decrypt(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array,
  passphrase: string
): Promise<string> {
  const key = await deriveKey(passphrase, salt);

  const plaintext = await crypto.subtle.decrypt(
    // FIX: Cast iv to BufferSource
    { name: 'AES-GCM', iv: iv as BufferSource }, 
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Serializes encrypted components into a single base64 string.
 * Format: base64(salt[16] + iv[12] + ciphertext[n])
 * This is what gets stored in IndexedDB.
 */
export function serializeEncrypted(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  salt: Uint8Array
): string {
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Deserializes a base64 string back into components.
 */
export function deserializeEncrypted(serialized: string): {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
} {
  const combined = Uint8Array.from(atob(serialized), (c) =>
    c.charCodeAt(0)
  );
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH).buffer;
  return { ciphertext, iv, salt };
}