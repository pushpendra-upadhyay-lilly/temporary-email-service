import crypto from 'crypto';
import { getPrisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { getConfig } from '../config';
import { ParsedEmail } from '../types';

/**
 * Email service for managing temporary email addresses and stored emails
 */
export class EmailService {
  private prisma = getPrisma();
  private config = getConfig();

  /**
   * Generate a random email address
   * @returns Random email address in format: xxxxx@domain
   */
  generateEmailAddress(): string {
    // Generate 8 random characters (alphanumeric)
    const randomPart = crypto
      .randomBytes(6)
      .toString('hex')
      .substring(0, 8)
      .toLowerCase();

    return `${randomPart}@${this.config.EMAIL_DOMAIN}`;
  }

  /**
   * Create a new temporary email address in the database
   * @param ttlMinutes Time to live in minutes
   * @returns Created email address record
   */
  async createEmailAddress(ttlMinutes?: number): Promise<{ address: string; expiresAt: Date }> {
    const ttl = Math.min(
      Math.max(ttlMinutes || this.config.DEFAULT_TTL_MINUTES, this.config.MIN_TTL_MINUTES),
      this.config.MAX_TTL_MINUTES
    );

    const address = this.generateEmailAddress();
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    try {
      const created = await this.prisma.emailAddress.create({
        data: {
          address,
          expiresAt,
        },
      });

      logger.info({ address, expiresAt, ttl }, 'Email address created');
      return { address: created.address, expiresAt: created.expiresAt };
    } catch (error) {
      logger.error({ error, address }, 'Failed to create email address');
      throw error;
    }
  }

  /**
   * Get an email address by its address string
   * @param address Email address
   * @returns Email address record or null
   */
  async getEmailAddress(address: string): Promise<{ id: string; address: string; expiresAt: Date } | null> {
    try {
      const emailAddress = await this.prisma.emailAddress.findUnique({
        where: { address },
        select: {
          id: true,
          address: true,
          expiresAt: true,
        },
      });

      return emailAddress;
    } catch (error) {
      logger.error({ error, address }, 'Failed to get email address');
      throw error;
    }
  }

  /**
   * Store a received email in the database
   * @param emailAddressId ID of the email address
   * @param email Parsed email data
   */
  async storeEmail(emailAddressId: string, email: ParsedEmail): Promise<{ id: string }> {
    try {
      const stored = await this.prisma.email.create({
        data: {
          emailAddressId,
          from: email.from,
          to: email.to,
          subject: email.subject,
          textBody: email.textBody,
          htmlBody: email.htmlBody,
          // Store JSON as string for SQLite compatibility
          attachmentsMetadata: email.attachmentsMetadata ? JSON.stringify(email.attachmentsMetadata) : null,
          headers: email.headers ? JSON.stringify(email.headers) : null,
        },
        select: { id: true },
      });

      logger.info({ emailId: stored.id, addressId: emailAddressId, from: email.from }, 'Email stored');
      return stored;
    } catch (error) {
      logger.error({ error, emailAddressId }, 'Failed to store email');
      throw error;
    }
  }

  /**
   * Get all emails for a given address
   * @param address Email address
   * @returns Array of emails with metadata
   */
  async getEmailsForAddress(address: string) {
    try {
      const emailAddress = await this.prisma.emailAddress.findUnique({
        where: { address },
        include: {
          emails: {
            select: {
              id: true,
              from: true,
              subject: true,
              receivedAt: true,
            },
            orderBy: {
              receivedAt: 'desc',
            },
          },
        },
      });

      if (!emailAddress) {
        return null;
      }

      // Check if expired
      if (new Date() > emailAddress.expiresAt) {
        logger.info({ address }, 'Address expired');
        return { address, emails: [], expired: true, expiresAt: emailAddress.expiresAt };
      }

      return {
        address,
        emails: emailAddress.emails,
        expired: false,
        expiresAt: emailAddress.expiresAt,
      };
    } catch (error) {
      logger.error({ error, address }, 'Failed to get emails for address');
      throw error;
    }
  }

  /**
   * Get a specific email by ID
   * @param emailId Email ID
   * @returns Full email details or null
   */
  async getEmailById(emailId: string) {
    try {
      const email = await this.prisma.email.findUnique({
        where: { id: emailId },
      });

      return email;
    } catch (error) {
      logger.error({ error, emailId }, 'Failed to get email');
      throw error;
    }
  }

  /**
   * Check if an email address exists and is not expired
   * @param address Email address
   * @returns true if address exists and is valid
   */
  async isAddressValid(address: string): Promise<boolean> {
    try {
      const emailAddress = await this.getEmailAddress(address);
      if (!emailAddress) return false;
      return new Date() < emailAddress.expiresAt;
    } catch {
      return false;
    }
  }
}

export const emailService = new EmailService();
