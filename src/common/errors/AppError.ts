/**
 * ============================================
 * AgroChain AI — Custom Application Error
 * ============================================
 * Centralized error class with HTTP status codes.
 * Distinguishes operational errors (expected) from programming errors (bugs).
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  /** 400 — Invalid request data */
  static badRequest(message: string, code: string = 'BAD_REQUEST'): AppError {
    return new AppError(message, 400, code);
  }

  /** 401 — Missing or invalid authentication */
  static unauthorized(message: string = 'Authentication required', code: string = 'UNAUTHORIZED'): AppError {
    return new AppError(message, 401, code);
  }

  /** 403 — Authenticated but insufficient permissions */
  static forbidden(message: string = 'Insufficient permissions', code: string = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  /** 404 — Resource not found */
  static notFound(message: string = 'Resource not found', code: string = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  /** 409 — Conflict with current state (e.g., duplicate payment) */
  static conflict(message: string, code: string = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  /** 422 — Unprocessable entity (valid syntax but semantic error) */
  static unprocessable(message: string, code: string = 'UNPROCESSABLE'): AppError {
    return new AppError(message, 422, code);
  }

  /** 429 — Rate limit exceeded */
  static rateLimited(message: string = 'Too many requests', code: string = 'RATE_LIMITED'): AppError {
    return new AppError(message, 429, code);
  }

  /** 500 — Internal server error (non-operational, likely a bug) */
  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR'): AppError {
    return new AppError(message, 500, code, false);
  }

  /** 502 — Bad gateway (upstream service failure) */
  static badGateway(message: string, code: string = 'BAD_GATEWAY'): AppError {
    return new AppError(message, 502, code);
  }

  /** 503 — Service unavailable */
  static serviceUnavailable(message: string, code: string = 'SERVICE_UNAVAILABLE'): AppError {
    return new AppError(message, 503, code);
  }
}
