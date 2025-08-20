import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { AppDataSource } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import routes from './routes';
import {
  corsOptions,
  helmetConfig,
  rateLimiter,
  errorHandler,
} from './middleware/security';

const app = express();

app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

app.use('/api', routes);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  errorHandler(err, req, res);
});

async function startServer() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established');

    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});