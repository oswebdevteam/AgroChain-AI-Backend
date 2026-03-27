import crypto from 'crypto';

/**
 * Generate a SHA-256 hash of the input string.
 * Used for hashing wallet addresses and party identifiers for on-chain privacy.
 *
 * @param input - String to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf-8').digest('hex');
}

/**
 * Generate an HMAC-SHA512 signature.
 * Used for verifying Interswitch webhook signatures.
 *
 * @param payload - The raw request body string
 * @param secret - The webhook secret key
 * @returns Hex-encoded HMAC-SHA512 signature
 */
export function hmacSha512(payload: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(payload, 'utf-8').digest('hex');
}

/**
 * Constant-time comparison of two strings.
 * Prevents timing attacks on webhook signature verification.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a unique idempotency key for payment transactions.
 * Format: AGRO-{timestamp}-{random} for easy debugging and uniqueness.
 *
 * @returns Unique transaction reference string
 */
export function generateTransactionRef(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `AGRO-${timestamp}-${random}`;
}

/**
 * Generate a UUID v4.
 *
 * @returns UUID v4 string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
