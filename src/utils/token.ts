// ─────────────────────────────────────────────────────────────
// utils/token.ts — Cryptographic token generation
// ─────────────────────────────────────────────────────────────

import { TOKEN_LENGTH, TOKEN_CHARS } from '../constants';

/**
 * Generates a cryptographically secure random token.
 * Uses crypto.getRandomValues for true randomness, preventing prediction.
 */
export function generateSecureToken(): string {
  const array = new Uint32Array(TOKEN_LENGTH);
  crypto.getRandomValues(array);
  let token = '';
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_CHARS[array[i] % TOKEN_CHARS.length];
  }
  return token;
}

/**
 * Validates a token string matches the expected format.
 */
export function isValidTokenFormat(token: string): boolean {
  if (token.length !== TOKEN_LENGTH) return false;
  return token.split('').every((ch) => TOKEN_CHARS.includes(ch));
}
