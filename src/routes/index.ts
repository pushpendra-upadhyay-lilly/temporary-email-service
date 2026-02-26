import { Router } from 'express';
import emailRoutes from './email.routes';

const router = Router();

// API routes
router.use('/emails', emailRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
