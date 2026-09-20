import "server-only";
import crypto from "crypto";
import { getEncryptionKeyBuffer } from "@/app/_lib/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = 1;
const VERSION_LENGTH = 1; // 1 byte version
const IV_LENGTH = 12; // 12 bytes recommended for GCM
const TAG_LENGTH = 16; // 16 bytes auth tag
const HEADER_LENGTH = VERSION_LENGTH + IV_LENGTH + TAG_LENGTH; // 29 bytes

function getEncryptionKey(): Buffer {
  return getEncryptionKeyBuffer();
}

/**
 * Encrypts a plaintext string using AES-256-GCM into a versioned buffer.
 * Output format: [1 byte version=1][12 bytes IV][16 bytes AuthTag][Ciphertext]
 */
export function encrypt(plaintext: string, aad?: string): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, "utf-8"));
  }

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const version = Buffer.from([VERSION]);

  return Buffer.concat([version, iv, tag, ciphertext]);
}

/**
 * Encrypts a plaintext string into PostgREST-safe bytea hex format (\x...).
 * Format: \x + hex([1 byte version=1][12 bytes IV][16 bytes AuthTag][Ciphertext])
 */
export function encryptToBytea(plaintext: string, aad?: string): string {
  const buf = encrypt(plaintext, aad);
  return `\\x${buf.toString("hex")}`;
}

/**
 * Decrypts a buffer or hex string containing [1 byte version=1][12 bytes IV][16 bytes AuthTag][Ciphertext].
 * Accepts: \x-prefixed hex, bare hex, and Buffer/Uint8Array.
 */
export function decryptFromBytea(value: string | Uint8Array | Buffer, aad?: string): string {
  let buf: Buffer;

  if (typeof value === "string") {
    let hexStr = value.trim();
    if (hexStr.startsWith("\\x") || hexStr.startsWith("\\\\x")) {
      hexStr = hexStr.replace(/^\\+x/i, "");
    }
    if (!/^[0-9a-f]+$/i.test(hexStr) || hexStr.length % 2 !== 0) {
      throw new Error("Invalid ciphertext encoding: expected an even-length hexadecimal string");
    }
    buf = Buffer.from(hexStr, "hex");
  } else if (Buffer.isBuffer(value)) {
    buf = value;
  } else if (value instanceof Uint8Array) {
    buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  } else {
    throw new Error("Invalid ciphertext input type: expected string, Buffer, or Uint8Array");
  }

  if (buf.length < HEADER_LENGTH) {
    throw new Error("Invalid ciphertext buffer: payload is too short");
  }

  const version = buf[0];
  if (version !== VERSION) {
    throw new Error(`Unsupported ciphertext version: ${version}`);
  }

  const key = getEncryptionKey();
  const iv = buf.subarray(VERSION_LENGTH, VERSION_LENGTH + IV_LENGTH);
  const tag = buf.subarray(VERSION_LENGTH + IV_LENGTH, HEADER_LENGTH);
  const ciphertext = buf.subarray(HEADER_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  if (aad) {
    decipher.setAAD(Buffer.from(aad, "utf-8"));
  }

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf-8");
}

/**
 * Decrypts an encrypted buffer or string using AES-256-GCM.
 * Delegates to decryptFromBytea.
 */
export function decrypt(encryptedBuffer: Buffer | string, aad?: string): string {
  return decryptFromBytea(encryptedBuffer, aad);
}

/**
 * Safely extracts the last 4 characters of a key or token for identification.
 */
export function getLast4(token: string): string {
  const clean = token.trim();
  return clean.length >= 4 ? clean.slice(-4) : clean;
}

/**
 * Formats a key/token into a secure masked string for display.
 * E.g. "AIzaSy..." -> "AIza••••••1234"
 */
export function maskKey(token: string, prefixLen = 4, suffixLen = 4): string {
  const clean = token.trim();
  if (clean.length <= prefixLen + suffixLen) {
    return "••••••••";
  }
  const prefix = clean.slice(0, prefixLen);
  const suffix = clean.slice(-suffixLen);
  return `${prefix}••••••${suffix}`;
}
