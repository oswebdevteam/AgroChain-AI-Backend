import pino from 'pino';
import { config } from './env';

/**
 * Structured JSON logger using Pino.
 * Redacts sensitive fields from logs to prevent accidental PII or credential exposure.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.cardNumber',
      'body.cvv',
      'body.pin',
      'payload.cardData',
      'payload.authData',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/**
 * Create a child logger scoped to a specific module.
 * Module name is included in every log entry from this logger.
 *
 * @param moduleName - The name of the module (e.g., 'escrow', 'payments')
 * @returns A child Pino logger instance
 */
export function createModuleLogger(moduleName: string): pino.Logger {
  return logger.child({ module: moduleName });
}
