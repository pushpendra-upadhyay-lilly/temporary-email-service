import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { getConfig } from './config';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import path from 'path';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // Trust proxy
  app.set('trust proxy', 1);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // CORS configuration
  const corsOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request logging middleware
  app.use((req: Request, res: Response, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(
        {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
          ip: req.ip,
        },
        'HTTP Request'
      );
    });

    next();
  });

  // Serve static files from public directory
  const publicPath = path.join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // API routes
  app.use('/api', apiRoutes);

  // Serve index.html for SPA routes
  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  // 404 handler (must be before error handler)
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
