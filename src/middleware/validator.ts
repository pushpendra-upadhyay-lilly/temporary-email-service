import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createEmailSchema } from '../types';
import { logger } from '../utils/logger';

/**
 * Validate email address format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-z0-9]+@[a-z.]+$/i;
  return emailRegex.test(email);
}

/**
 * Middleware to validate create email request
 */
export function validateCreateEmailRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    const validated = createEmailSchema.parse(req.query);
    (req as any).validatedQuery = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn({ errors: error.errors }, 'Validation error');
      res.status(400).json({
        error: 'Invalid request parameters',
        details: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    next(error);
  }
}

/**
 * Middleware to validate email address parameter
 */
export function validateEmailAddressParam(req: Request, res: Response, next: NextFunction): void {
  const { address } = req.params;

  if (!address || !isValidEmailFormat(address)) {
    res.status(400).json({
      error: 'Invalid email address format',
    });
    return;
  }

  next();
}

/**
 * Middleware to validate email ID parameter
 */
export function validateEmailIdParam(req: Request, res: Response, next: NextFunction): void {
  const { emailId } = req.params;

  if (!emailId || emailId.length < 1) {
    res.status(400).json({
      error: 'Invalid email ID',
    });
    return;
  }

  next();
}
