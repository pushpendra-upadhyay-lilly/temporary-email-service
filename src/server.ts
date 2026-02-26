import dotenv from 'dotenv';
import { createApp } from './app';
import { createSMTPServer, startSMTPServer, closeSMTPServer } from './smtp/smtp-server';
import { cleanupService } from './services/cleanup.service';
import { logger } from './utils/logger';
import { getConfig } from './config';
import { disconnectPrisma } from './utils/prisma';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  const config = getConfig();

  logger.info({ env: config.NODE_ENV }, 'Starting Temporary Email Service');

  // Create Express app
  const app = createApp();

  // Create SMTP server
  const smtpServer = createSMTPServer();

  // Start cleanup scheduler (runs every 60 seconds)
  cleanupService.startCleanupScheduler(60000);

  // Start HTTP server
  const httpServer = app.listen(config.PORT, '0.0.0.0', () => {
    logger.info({ port: config.PORT }, 'HTTP server listening');
  });

  // Start SMTP server
  try {
    await startSMTPServer(smtpServer, config.SMTP_PORT);
  } catch (error) {
    logger.error({ error }, 'Failed to start SMTP server');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    try {
      // Stop accepting new connections
      cleanupService.stopCleanupScheduler();

      // Close HTTP server with a timeout to force-close connections
      await new Promise<void>((resolve) => {
        const closeTimeout = setTimeout(() => {
          logger.warn('HTTP server close timeout - force closing connections');
          resolve();
        }, 5000);

        httpServer.close(() => {
          clearTimeout(closeTimeout);
          logger.info('HTTP server closed');
          resolve();
        });

        // Destroy all socket connections if they're still open
        httpServer.closeAllConnections?.();
      });

      // Close SMTP server
      await closeSMTPServer(smtpServer);

      // Disconnect database
      await disconnectPrisma();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); 

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught exception');
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled rejection');
  });
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error in main');
  process.exit(1);
});
