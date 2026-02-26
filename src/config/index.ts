import { z } from 'zod';
import { logger } from '../utils/logger';

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SMTP_PORT: z.coerce.number().default(2525),
  DATABASE_URL: z.string().default('file:./dev.db'),
  EMAIL_DOMAIN: z.string().default('temp.local'),
  BASE_URL: z.string().default('http://localhost:3000'),
  DEFAULT_TTL_MINUTES: z.coerce.number().default(15),
  MAX_TTL_MINUTES: z.coerce.number().default(60),
  MIN_TTL_MINUTES: z.coerce.number().default(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

type Config = z.infer<typeof configSchema>;

let config: Config;

export function getConfig(): Config {
  if (!config) {
    // Load environment variables
    const env = {
      PORT: process.env.PORT,
      SMTP_PORT: process.env.SMTP_PORT,
      DATABASE_URL: process.env.DATABASE_URL,
      EMAIL_DOMAIN: process.env.EMAIL_DOMAIN,
      BASE_URL: process.env.BASE_URL,
      DEFAULT_TTL_MINUTES: process.env.DEFAULT_TTL_MINUTES,
      MAX_TTL_MINUTES: process.env.MAX_TTL_MINUTES,
      MIN_TTL_MINUTES: process.env.MIN_TTL_MINUTES,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      NODE_ENV: process.env.NODE_ENV,
      LOG_LEVEL: process.env.LOG_LEVEL,
    };

    try {
      config = configSchema.parse(env);
      logger.info({ config: { ...config, DATABASE_URL: '***' } }, 'Configuration loaded');
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error({ errors: error.errors }, 'Configuration validation failed');
        process.exit(1);
      }
      throw error;
    }
  }

  return config;
}
