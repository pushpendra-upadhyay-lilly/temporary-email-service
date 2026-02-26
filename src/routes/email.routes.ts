import { Router, Request, Response } from 'express';
import { emailService } from '../services/email.service';
import { createEmailLimiter, readEmailLimiter } from '../middleware/rate-limiter';
import { validateCreateEmailRequest, validateEmailAddressParam, validateEmailIdParam } from '../middleware/validator';
import { logger } from '../utils/logger';
import { getConfig } from '../config';

const router = Router();
const config = getConfig();

/**
 * POST /api/emails/create
 * Create a new temporary email address
 * Query params: ttl (optional, in minutes)
 * Response: { address: string, expiresAt: ISO string }
 */
router.post('/create', createEmailLimiter, validateCreateEmailRequest, async (req: Request, res: Response) => {
  try {
    const validatedQuery = (req as any).validatedQuery;
    const ttl = validatedQuery?.ttl;

    const result = await emailService.createEmailAddress(ttl);

    logger.info({ address: result.address }, 'Email address created via API');

    res.status(201).json({
      address: result.address,
      expiresAt: result.expiresAt.toISOString(),
      expiresIn: Math.floor((result.expiresAt.getTime() - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error({ error }, 'Error creating email address');
    res.status(500).json({ error: 'Failed to create email address' });
  }
});

/**
 * GET /api/emails/:address
 * Get all emails for a temporary email address
 * Response: { address, emails: [...], expiresAt, expired }
 */
router.get('/:address', readEmailLimiter, validateEmailAddressParam, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const result = await emailService.getEmailsForAddress(address);

    if (!result) {
      res.status(404).json({
        error: 'Email address not found',
      });
      return;
    }

    logger.info({ address }, 'Fetched emails for address');

    res.json(result);
  } catch (error) {
    logger.error({ error }, 'Error fetching emails for address');
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * GET /api/emails/:address/:emailId
 * Get a specific email by ID
 * Response: Full email details including HTML body
 */
router.get('/:address/:emailId', readEmailLimiter, validateEmailAddressParam, validateEmailIdParam, async (req: Request, res: Response) => {
  try {
    const { address, emailId } = req.params;

    // Verify the address exists
    const emailAddress = await emailService.getEmailAddress(address);
    if (!emailAddress) {
      res.status(404).json({ error: 'Email address not found' });
      return;
    }

    // Get the email
    const email = await emailService.getEmailById(emailId);

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    // Verify the email belongs to this address
    if (email.emailAddressId !== emailAddress.id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    logger.info({ address, emailId }, 'Fetched email details');

    res.json(email);
  } catch (error) {
    logger.error({ error }, 'Error fetching email');
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
