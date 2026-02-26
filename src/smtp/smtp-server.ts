import { SMTPServer, SMTPServerOptions, SMTPServerSession } from 'smtp-server';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';
import { parseEmail } from './email-parser';
import { getConfig } from '../config';

/**
 * SMTP Server configuration and setup
 * Receives emails destined for temporary email addresses
 * Prevents open relay by only accepting emails for registered addresses
 */
export function createSMTPServer(): SMTPServer {
  const config = getConfig();

  const smtpOptions: SMTPServerOptions = {
    // Disable STARTTLS and AUTH for simplicity - adapt as needed for production
    disableReverseLookup: true,
    allowInsecureAuth: true,
    authOptional: true,

    /**
     * Handle incoming connection
     */
    onConnect: (session: SMTPServerSession, callback: (err?: Error) => void) => {
      logger.info({ remoteAddress: session.remoteAddress }, 'SMTP connection received');

      callback();
    },

    /**
     * Validate recipient before accepting the email
     * This prevents open relay - only our registered addresses can receive mail
     */
    onRcptTo: async (address: any, session, callback) => {
      const recipientEmail = (address as any).address.toLowerCase();

      logger.debug({ recipient: recipientEmail }, 'RCPT TO received');

      try {
        // Check if this is a valid, non-expired address
        const isValid = await emailService.isAddressValid(recipientEmail);

        if (!isValid) {
          // Reject if address doesn't exist or is expired
          logger.warn({ recipient: recipientEmail }, 'Rejecting mail for non-existent or expired address');
          return callback(new Error(`Recipient <${recipientEmail}> not found`));
        }

        callback(); // Accept this recipient
      } catch (error) {
        logger.error({ error, recipient: recipientEmail }, 'Error validating recipient');
        callback(new Error('Internal server error'));
      }
    },

    /**
     * Handle incoming email data
     */
    onData: async (stream, session, callback) => {
      try {
        logger.debug(
          { from: session.envelope.mailFrom ? (session.envelope.mailFrom as any).address : 'unknown', to: session.envelope.rcptTo.map((r: any) => r.address) },
          'Receiving email data'
        );

        // Parse the email stream
        const parsedEmail = await parseEmail(stream);

        // Get the recipient address (should be only one since we validate per address)
        const recipientAddress = session.envelope.rcptTo[0].address.toLowerCase();

        // Get the email address record
        const emailAddressRecord = await emailService.getEmailAddress(recipientAddress);

        if (!emailAddressRecord) {
          logger.error({ address: recipientAddress }, 'Email address not found after validation');
          return callback(new Error('Address not found'));
        }

        // Store the email
        await emailService.storeEmail(emailAddressRecord.id, parsedEmail);

        logger.info(
          { recipient: recipientAddress, from: parsedEmail.from, subject: parsedEmail.subject },
          'Email stored successfully'
        );

        callback(); // Email accepted
      } catch (error) {
        logger.error({ error, envelope: session.envelope }, 'Error processing email');
        callback(error as Error);
      }
    },

    /**
     * Handle connection closed
     */
    onClose: (session: SMTPServerSession) => {
      logger.debug({ remoteAddress: session.remoteAddress }, 'SMTP connection closed');
    },
  };

  return new SMTPServer(smtpOptions);
}

/**
 * Start SMTP server on configured port
 */
export function startSMTPServer(server: SMTPServer, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      logger.info({ port }, 'SMTP server started');
      resolve();
    });

    server.on('error', (err) => {
      logger.error({ error: err }, 'SMTP server error');
      reject(err);
    });
  });
}

/**
 * Close SMTP server gracefully
 */
export function closeSMTPServer(server: SMTPServer): Promise<void> {
  return new Promise((resolve) => {
    const closeTimeout = setTimeout(() => {
      logger.warn('SMTP server close timeout - forcing shutdown');
      // Force destroy the server if it hasn't closed after timeout
      (server as any).destroy?.();
      resolve();
    }, 3000);

    server.close(() => {
      clearTimeout(closeTimeout);
      logger.info('SMTP server closed');
      resolve();
    });
  });
}
