import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { env } from '../config/env';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

// Custom key generator for Fly.io proxy setup
const keyGenerator = (req: Request): string => {
  // Use Fly-Client-IP header if available (Fly.io specific)
  const flyClientIp = req.headers['fly-client-ip'] as string;
  if (flyClientIp) return flyClientIp;
  
  // Fallback to X-Forwarded-For
  const forwarded = req.headers['x-forwarded-for'] as string;
  if (forwarded) {
    // Take the first IP from the chain
    const firstIp = forwarded.split(',')[0];
    return firstIp ? firstIp.trim() : 'unknown';
  }
  
  // Final fallback to req.ip
  return req.ip || 'unknown';
};

export const rateLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator, // Use custom key generator for Fly.io
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

export const transactionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many transaction requests, please wait before trying again',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator, // Use custom key generator for Fly.io
});

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://app.dynamic.xyz", "https://app.dynamicauth.com", "https://logs.dynamicauth.com", "https://vencura.fly.dev", "wss:", "https:"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://app.dynamic.xyz", "https://app.dynamicauth.com", "https://verify.walletconnect.com", "https://verify.walletconnect.org"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

export function errorHandler(err: Error, _req: Request, res: Response): void {
  logger.error('Request error occurred', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
}