/**
 * VenCura Backend Server
 * 
 * Express.js server providing custodial wallet management APIs with:
 * - JWT-based authentication using Dynamic SDK
 * - Encrypted private key storage with AES-256-GCM
 * - Ethereum blockchain integration via Ethers.js
 * - Real-time transaction updates via WebSocket
 * - Comprehensive security middleware and rate limiting
 * - Structured logging with correlation IDs
 * - API documentation with Swagger/OpenAPI
 * 
 * Architecture:
 * - Monorepo structure with shared types and schemas
 * - TypeORM for database operations (PostgreSQL/SQLite)
 * - Production deployment on Fly.io with Docker
 * - Frontend served statically in production mode
 * 
 * Security Features:
 * - Helmet.js security headers
 * - CORS with configurable origins
 * - Rate limiting (100 req/15min, 5 req/15min for transactions)
 * - JWT token validation with user verification
 * - Private key encryption at rest
 * - Audit logging for all operations
 * 
 * @fileoverview Main application server with full-stack configuration
 */

import 'reflect-metadata'; // Required for TypeORM decorators
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './config/database';
import { env } from './config/env';
import { logger, correlationIdMiddleware, Logger } from './utils/logger';
import routes from './routes';
import { swaggerSpec } from './docs/swagger';
import './docs/swaggerRoutes'; // Import for JSDoc comments registration
import { WebSocketService } from './services/WebSocketService';
import {
  corsOptions,
  helmetConfig,
  rateLimiter,
  errorHandler,
} from './middleware/security';
import { requestLogger, errorLogger } from './middleware/requestLogger';
import { AuthRequest } from './middleware/auth';

// Initialize Express application
const app = express();

// Configure Express settings for production deployment
// Trust proxy headers from Fly.io load balancer for accurate client IP detection
app.set('trust proxy', true);

// Disable X-Powered-By header for security
app.disable('x-powered-by');

/**
 * Production Static File Serving
 * 
 * In production, the backend serves the built frontend application.
 * Static assets are served with appropriate caching headers and MIME types.
 * This configuration supports the full-stack deployment on Fly.io.
 */
if (env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  
  logger.info('Configuring production static file serving', {
    frontendPath,
    nodeEnv: env.NODE_ENV,
  });
  
  // Serve static assets (CSS, JS, images) with aggressive caching
  app.use('/assets', express.static(path.join(frontendPath, 'assets'), {
    maxAge: '1d', // 24-hour cache for versioned assets
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
      // Set correct MIME types for better browser compatibility
      if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filepath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filepath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
      } else if (filepath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      
      // Add security headers for static assets
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }));
  
  // Serve other static files (favicon, robots.txt, etc.) with shorter cache
  app.use(express.static(frontendPath, {
    index: false, // Don't serve index.html for all routes yet
    maxAge: '1h', // Shorter cache for root files
  }));
}

/**
 * Core Middleware Configuration
 * 
 * Applied in specific order for optimal security and functionality:
 * 1. Security headers (Helmet.js)
 * 2. CORS policy enforcement
 * 3. Request body parsing
 * 4. Request correlation and logging
 * 5. Rate limiting protection
 */

// Apply security headers (Content Security Policy, HSTS, etc.)
app.use(helmetConfig);

// Configure Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// Parse JSON request bodies (limit: 10mb for file uploads)
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add correlation ID for distributed tracing
app.use(correlationIdMiddleware);

// Log all HTTP requests and responses
app.use(requestLogger);

// Apply global rate limiting (100 requests per 15 minutes)
app.use(rateLimiter);

/**
 * API Documentation Endpoint
 * 
 * Swagger/OpenAPI documentation available at /api/docs
 * Includes interactive API explorer for testing endpoints
 */
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }', // Hide Swagger branding
  customSiteTitle: 'VenCura API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true, // Remember JWT tokens during session
    displayRequestDuration: true, // Show response times
    tryItOutEnabled: true, // Enable "Try it out" functionality
  },
}));

logger.info('API documentation available at /api/docs');

/**
 * API Routes Registration
 * 
 * All API endpoints are mounted under /api prefix:
 * - /api/auth - Authentication endpoints (login, logout)
 * - /api/wallets - Wallet management endpoints
 * - /api/health - Health check and monitoring endpoints
 */
app.use('/api', routes);

/**
 * Single Page Application (SPA) Fallback
 * 
 * In production, serves the React application's index.html for all non-API routes.
 * This enables client-side routing to work correctly with direct URL access.
 * Must be placed AFTER API routes to avoid interfering with backend endpoints.
 */
if (env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  const indexPath = path.join(frontendPath, 'index.html');
  
  // Catch-all route for React Router (must be last)
  app.get('*', (req, res, next) => {
    // Skip if this is an API request that wasn't matched
    if (req.path.startsWith('/api/')) {
      return next(); // Let error handler deal with 404
    }
    
    // Serve React app's index.html with no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(indexPath, (err) => {
      if (err) {
        logger.error('Failed to serve React app', err);
        res.status(500).json({ error: 'Failed to load application' });
      }
    });
  });
  
  logger.info('SPA fallback configured for React Router');
}

/**
 * Error Handling Middleware
 * 
 * Must be registered last to catch all errors from routes and middleware.
 * Provides structured error responses with correlation IDs for debugging.
 */

// Log all errors with request context
app.use(errorLogger);

// Global error handler with structured responses
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Delegate to centralized error handler
  errorHandler(err, req, res);
});

// Handle 404 for unmatched routes
app.use((req: express.Request, res: express.Response) => {
  const logger = (req as AuthRequest).logger || new Logger();
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });
  
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource was not found',
    path: req.path,
    method: req.method,
  });
});

/**
 * Server Startup Function
 * 
 * Initializes the server with retry logic for database connections.
 * Handles graceful startup with proper error recovery and WebSocket integration.
 * 
 * Startup Sequence:
 * 1. Initialize database connection (with retries)
 * 2. Create HTTP server instance
 * 3. Initialize WebSocket service (optional)
 * 4. Start listening on configured port
 * 5. Register process signal handlers
 * 
 * @returns Promise<void>
 */
async function startServer(): Promise<void> {
  let retries = 0;
  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds between retries
  
  logger.info('Starting VenCura backend server', {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    maxRetries,
  });
  
  while (retries < maxRetries) {
    try {
      // Initialize database connection with retry logic
      logger.info(`Attempting database connection (attempt ${retries + 1}/${maxRetries})`);
      await AppDataSource.initialize();
      
      logger.info('Database connection established successfully', {
        database: AppDataSource.options.database || 'PostgreSQL',
        entities: AppDataSource.entityMetadatas.length,
      });

      // Configure server settings
      const port = parseInt(env.PORT, 10) || 3001;
      const host = '0.0.0.0'; // Listen on all interfaces for Docker
      
      // Create HTTP server with Express app
      const server = createServer(app);
      
      // Initialize WebSocket service for real-time updates
      try {
        WebSocketService.initialize(server);
        logger.info('WebSocket service initialized successfully');
      } catch (wsError) {
        logger.warn('WebSocket service initialization failed, continuing without real-time updates', {
          error: wsError instanceof Error ? wsError.message : 'Unknown error',
        });
      }
      
      // Start HTTP server
      server.listen(port, host, () => {
        logger.info('Server started successfully', {
          host,
          port,
          environment: env.NODE_ENV,
          pid: process.pid,
          uptime: process.uptime(),
        });
        
        // Log service availability
        logger.info('Services available:', {
          api: `http://${host}:${port}/api`,
          docs: `http://${host}:${port}/api/docs`,
          websocket: `ws://${host}:${port}`,
        });
      });
      
      // Configure graceful shutdown handlers
      setupGracefulShutdown(server);
      
      return; // Successful startup
      
    } catch (error) {
      retries++;
      
      logger.error('Server startup failed', error, {
        attempt: retries,
        maxRetries,
        willRetry: retries < maxRetries,
      });
      
      if (retries < maxRetries) {
        logger.info(`Retrying startup in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error('Maximum startup retries exceeded, shutting down', {
          totalAttempts: retries,
          maxRetries,
        });
        process.exit(1);
      }
    }
  }
}

/**
 * Configure graceful shutdown handlers
 * 
 * Registers signal handlers for SIGTERM and SIGINT to perform
 * clean shutdown of database connections and HTTP server.
 * 
 * @param server - HTTP server instance to close
 */
function setupGracefulShutdown(server: ReturnType<typeof createServer>): void {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, 30000); // 30-second timeout
    
    try {
      // Close HTTP server
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
      
      // Close database connection
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('Database connection closed');
      }
      
      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };
  
  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception occurred', error);
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason,
      promise: promise.toString(),
    });
    process.exit(1);
  });
  
  logger.info('Graceful shutdown handlers registered');
}

/**
 * Application Entry Point
 * 
 * Start the server with comprehensive error handling.
 * Any unhandled errors during startup will be logged and cause process exit.
 */
startServer().catch((error) => {
  logger.error('Fatal startup error occurred', error, {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    memory: process.memoryUsage(),
  });
  process.exit(1);
});