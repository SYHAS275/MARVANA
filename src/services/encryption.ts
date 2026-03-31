/**
 * End-to-End Encryption Service
 *
 * Uses NaCl box (Curve25519 + XSalsa20 + Poly1305) via tweetnacl.
 * - Key pair generated once per device, private key stored in SecureStore
 * - Public key uploaded to Supabase profiles.public_key
 * - Encrypted messages are prefixed with [E2E] for detection
 */

import nacl from 'tweetnacl';
import { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import * as SecureStore from 'expo-secure-store';

const PRIVATE_KEY_KEY = 'marvana_e2e_private_key_v1';
const PUBLIC_KEY_KEY  = 'marvana_e2e_public_key_v1';

export const E2E_PREFIX = '[E2E]';

// ── Key management ────────────────────────────────────────────────────────────

/** Returns existing key pair or generates a new one. Keys are base64-encoded. */
export async function getOrCreateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const storedPrivate = await SecureStore.getItemAsync(PRIVATE_KEY_KEY);
  const storedPublic  = await SecureStore.getItemAsync(PUBLIC_KEY_KEY);

  if (storedPrivate && storedPublic) {
    return { publicKey: storedPublic, privateKey: storedPrivate };
  }

  // Generate fresh key pair
  const keyPair = nacl.box.keyPair();
  const publicKey  = encodeBase64(keyPair.publicKey);
  const privateKey = encodeBase64(keyPair.secretKey);

  await SecureStore.setItemAsync(PRIVATE_KEY_KEY, privateKey);
  await SecureStore.setItemAsync(PUBLIC_KEY_KEY,  publicKey);

  return { publicKey, privateKey };
}

export async function getMyPublicKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PUBLIC_KEY_KEY);
}

export async function getMyPrivateKey(): Promise<string | null> {
  return SecureStore.getItemAsync(PRIVATE_KEY_KEY);
}

/** Wipe keys — call on logout so a new pair is generated next login */
export async function clearKeyPair(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PRIVATE_KEY_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(PUBLIC_KEY_KEY).catch(() => {}),
  ]);
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message for a recipient.
 * Returns a base64 string prefixed with [E2E].
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKeyB64: string,
  senderPrivateKeyB64: string,
): string {
  const recipientPub = decodeBase64(recipientPublicKeyB64);
  const senderPriv   = decodeBase64(senderPrivateKeyB64);
  const nonce        = nacl.randomBytes(nacl.box.nonceLength);
  const msgBytes     = encodeUTF8(plaintext);

  const encrypted = nacl.box(msgBytes, nonce, recipientPub, senderPriv);

  // Pack nonce + ciphertext into one payload
  const payload = new Uint8Array(nonce.length + encrypted.length);
  payload.set(nonce);
  payload.set(encrypted, nonce.length);

  return E2E_PREFIX + encodeBase64(payload);
}

/**
 * Decrypt a message received from a sender.
 * Returns plaintext, or null if decryption fails (wrong key / tampered).
 */
export function decryptMessage(
  encryptedContent: string,
  senderPublicKeyB64: string,
  recipientPrivateKeyB64: string,
): string | null {
  try {
    const b64 = encryptedContent.startsWith(E2E_PREFIX)
      ? encryptedContent.slice(E2E_PREFIX.length)
      : encryptedContent;

    const senderPub  = decodeBase64(senderPublicKeyB64);
    const recipPriv  = decodeBase64(recipientPrivateKeyB64);
    const payload    = decodeBase64(b64);

    const nonce     = payload.slice(0, nacl.box.nonceLength);
    const ciphertext = payload.slice(nacl.box.nonceLength);

    const decrypted = nacl.box.open(ciphertext, nonce, senderPub, recipPriv);
    if (!decrypted) return null;

    return decodeUTF8(decrypted);
  } catch {
    return null;
  }
}

/** Returns true if a message content string is E2E encrypted */
export function isEncrypted(content: string): boolean {
  return content.startsWith(E2E_PREFIX);
}
