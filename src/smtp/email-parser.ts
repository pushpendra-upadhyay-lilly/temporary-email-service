import { Readable } from 'stream';
import { simpleParser, ParsedMail } from 'mailparser';
import { logger } from '../utils/logger';
import { ParsedEmail } from '../types';

/**
 * Parse incoming email stream and extract relevant data
 * Handles text, HTML, and attachments metadata
 * @param stream Email data stream from SMTP
 * @returns Parsed email object
 */
export async function parseEmail(stream: Readable): Promise<ParsedEmail> {
  return new Promise((resolve, reject) => {
    simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
      if (err) {
        logger.error({ error: err }, 'Email parsing error');
        reject(new Error('Failed to parse email'));
        return;
      }

      try {
        // Extract attachment metadata (filename, mimetype, size)
        const attachmentsMetadata = parsed.attachments.map((att) => ({
          filename: att.filename || 'unknown',
          mimetype: att.contentType || 'application/octet-stream',
          size: att.size || 0,
        }));

        // Build the parsed email object
        const fromAddr = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
        const toAddr = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to;

        const parsedEmail: ParsedEmail = {
          from: (fromAddr as any)?.text || (fromAddr as any)?.address || 'unknown',
          to: (toAddr as any)?.text || (toAddr as any)?.address || 'unknown',
          subject: parsed.subject || '(no subject)',
          textBody: parsed.text || undefined,
          htmlBody: parsed.html || undefined,
          attachmentsMetadata: attachmentsMetadata.length > 0 ? attachmentsMetadata : undefined,
          headers: parsed.headers ? Object.fromEntries(parsed.headers) : undefined,
        };

        logger.debug(
          {
            from: parsedEmail.from,
            subject: parsedEmail.subject,
            hasText: !!parsedEmail.textBody,
            hasHtml: !!parsedEmail.htmlBody,
            attachmentCount: attachmentsMetadata.length,
          },
          'Email parsed successfully'
        );

        resolve(parsedEmail);
      } catch (error) {
        logger.error({ error }, 'Error extracting email data');
        reject(error);
      }
    });
  });
}
