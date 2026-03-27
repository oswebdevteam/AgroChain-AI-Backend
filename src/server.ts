import app from './app';
import { config } from './config/env';
import { logger } from './config/logger';

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      environment: config.NODE_ENV,
      apiVersion: config.API_VERSION,
    },
    ` AgroChain AI server started on port ${PORT}`
  );
  logger.info(` API Docs: http://localhost:${PORT}/api/docs`);
  logger.info(`  Health: http://localhost:${PORT}/health`);
});

// ============================================
// Graceful Shutdown
// ============================================

function gracefulShutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal — closing server gracefully');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ error }, 'Uncaught Exception — shutting down');
  process.exit(1);
});

export { server };
