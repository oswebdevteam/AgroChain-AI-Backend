import pinoHttp from 'pino-http';
import { logger } from '../../config/logger';

/**
 * HTTP request/response logger middleware.
 * Logs method, URL, status code, and response time.
 * Sensitive headers are automatically redacted by the parent logger config.
 */
export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => {
      // Don't log health check or swagger requests to reduce noise
      const url = req.url ?? '';
      return url === '/health' || url.startsWith('/api/docs');
    },
  },
  customLogLevel: (_req, res, error) => {
    if (error || (res.statusCode && res.statusCode >= 500)) return 'error';
    if (res.statusCode && res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} → ${res.statusCode}`;
  },
  customErrorMessage: (req, _res, error) => {
    return `${req.method} ${req.url} failed: ${error.message}`;
  },
});
