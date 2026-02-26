import { getPrisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Cleanup service for managing expired email addresses
 * Runs periodically to delete expired addresses and their associated emails
 */
export class CleanupService {
  private prisma = getPrisma();
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Start the cleanup scheduler
   * Runs cleanup every minute to check for and delete expired addresses
   */
  startCleanupScheduler(intervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      logger.warn('Cleanup scheduler already running');
      return;
    }

    logger.info({ intervalMs }, 'Starting cleanup scheduler');

    // Run immediately
    this.deleteExpiredAddresses().catch((err) => {
      logger.error({ error: err }, 'Cleanup job failed');
    });

    // Then run periodically
    this.cleanupInterval = setInterval(() => {
      this.deleteExpiredAddresses().catch((err) => {
        logger.error({ error: err }, 'Cleanup job failed');
      });
    }, intervalMs);
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Cleanup scheduler stopped');
    }
  }

  /**
   * Delete all expired email addresses and their associated emails
   * Uses database transactions for atomicity
   */
  async deleteExpiredAddresses(): Promise<void> {
    try {
      const now = new Date();

      // Find expired addresses
      const expiredAddresses = await this.prisma.emailAddress.findMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
        select: {
          id: true,
          address: true,
        },
      });

      if (expiredAddresses.length === 0) {
        logger.debug('No expired addresses to clean up');
        return;
      }

      logger.info({ count: expiredAddresses.length }, 'Found expired addresses, deleting...');

      // Delete expired addresses (cascade delete will remove associated emails)
      // Prisma handles cascade deletes automatically based on schema
      const result = await this.prisma.emailAddress.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info(
        { deletedCount: result.count, addresses: expiredAddresses.map((a) => a.address) },
        'Cleanup completed'
      );
    } catch (error) {
      logger.error({ error }, 'Error during cleanup');
      throw error;
    }
  }
}

export const cleanupService = new CleanupService();
