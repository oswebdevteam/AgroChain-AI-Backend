/**
 * ============================================
 * AgroChain AI — Rate Limiting Middleware
 * ============================================
 * Configurable rate limiting per IP and per user.
 * Stricter limits on authentication endpoints.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../../config/env';

/**
 * Global rate limiter applied to all API routes.
 * Configurable via environment variables.
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Stricter rate limiter for auth endpoints (login, register, OTP).
 * Prevents brute-force attacks on authentication flows.
 */
export const authRateLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many authentication attempts. Please try again later.',
  },
});
