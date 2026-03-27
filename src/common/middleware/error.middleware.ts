/**
 * ============================================
 * AgroChain AI — Centralized Error Handler
 * ============================================
 * Catches all errors, logs them, and returns standardized responses.
 * Distinguishes operational errors from unexpected bugs.
 * Never leaks stack traces in production.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { createModuleLogger } from '../../config/logger';
import { config } from '../../config/env';

const logger = createModuleLogger('error-handler');

/**
 * Express error-handling middleware (4-argument signature).
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    logger.warn({ path: req.path, errors: formattedErrors }, 'Validation error');

    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: formattedErrors,
    });
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    // Only log full details for server errors
    if (err.statusCode >= 500) {
      logger.error(
        { err, path: req.path, method: req.method },
        'Server error occurred'
      );
    } else {
      logger.warn(
        { code: err.code, statusCode: err.statusCode, path: req.path },
        err.message
      );
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Handle unexpected/programming errors
  logger.error(
    { err, path: req.path, method: req.method },
    'Unexpected error occurred'
  );

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message:
      config.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
  });
}
