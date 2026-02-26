import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * Rate limiter for creating new email addresses
 * Prevents abuse by limiting to 10 requests per 15 minutes per IP
 */
export const createEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many email addresses created, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, 'Rate limit exceeded for create email');
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  },
});

/**
 * Rate limiter for reading emails
 * Allows 60 requests per minute per IP
 */
export const readEmailLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  },
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded for read email');
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
    });
  },
});
