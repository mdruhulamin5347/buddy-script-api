import { createServer } from 'http';
import config from './config';
import app from './app';
import logger from './utils/logger';
import cached from './infrastructure/cache/cache';

const startServer = async () => {
  try {
    // Connect to Redis
    try {
      await cached.connect();
    } catch (err) {
      logger.warn("Redis unavailable. Continuing without cache.");
    }
    const httpServer = createServer(app);
    // Start HTTP server
    httpServer.listen(config.port, '0.0.0.0', () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');
        // Close Redis connection
        try {
          await cached.disconnect();
        } catch (err) {
          logger.error("Failed to disconnect Redis", err);
        }

        logger.info('All connections closed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();