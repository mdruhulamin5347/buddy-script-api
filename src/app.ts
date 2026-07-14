import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { rateLimiter } from './middleware/rateLimiter';
import logger from './utils/logger';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Rate limiting
app.use(rateLimiter);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}



// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// API routes
// app.use('/api/v1', authRouter);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

export default app;
