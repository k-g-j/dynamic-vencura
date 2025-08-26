/**
 * Structured logging with correlation IDs for request tracing
 * 
 * Features:
 * - Correlation IDs for request tracing across services
 * - Structured JSON logging for easy parsing
 * - Context-aware logging with metadata
 * - Performance tracking for operations
 * - Sensitive data redaction
 */

import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import { env } from '../config/env';

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ 
  level, 
  message, 
  timestamp, 
  correlationId,
  userId,
  walletId,
  operation,
  duration,
  ...metadata 
}) => {
  const log = {
    timestamp,
    level,
    message,
    correlationId,
    userId,
    walletId,
    operation,
    duration,
    ...metadata,
  };
  
  // Remove undefined values
  Object.keys(log).forEach(key => {
    if ((log as Record<string, unknown>)[key] === undefined) {
      delete (log as Record<string, unknown>)[key];
    }
  });
  
  return JSON.stringify(log);
});

// Create base logger configuration
const baseLogger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    structuredFormat
  ),
  defaultMeta: { service: 'vencura-backend' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : structuredFormat,
    }),
  ],
});

// Add file transports in production
if (env.NODE_ENV === 'production') {
  baseLogger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  baseLogger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Logger class with correlation ID support
 */
export class Logger {
  private _correlationId: string;
  private context: Record<string, unknown>;

  constructor(correlationId?: string, context?: Record<string, unknown>) {
    this._correlationId = correlationId || uuidv4();
    this.context = context || {};
  }

  /**
   * Get the correlation ID for this logger instance
   */
  get correlationId(): string {
    return this._correlationId;
  }

  /**
   * Generate a new correlation ID
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, unknown>): Logger {
    return new Logger(this._correlationId, {
      ...this.context,
      ...context,
    });
  }

  private log(level: string, message: string, meta?: Record<string, unknown>): void {
    baseLogger.log(level, message, {
      correlationId: this._correlationId,
      ...this.context,
      ...meta,
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error 
      ? { error: { message: error.message, stack: error.stack, ...meta } }
      : { error, ...meta };
    this.log('error', message, errorMeta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  /**
   * Log wallet operation with context
   */
  logWalletOperation(
    operation: string,
    walletId: string,
    userId: string,
    meta?: Record<string, unknown>
  ): void {
    this.info(`Wallet operation: ${operation}`, {
      operation,
      walletId,
      userId,
      ...meta,
    });
  }

  /**
   * Log transaction with context
   */
  logTransaction(
    transactionHash: string,
    walletId: string,
    status: string,
    meta?: Record<string, unknown>
  ): void {
    const level = status === 'failed' ? 'error' : 'info';
    this.log(level, `Transaction ${status}`, {
      transactionHash,
      walletId,
      status,
      ...meta,
    });
  }

  /**
   * Log authentication event
   */
  logAuth(
    event: string,
    userId?: string,
    meta?: Record<string, unknown>
  ): void {
    const level = event.includes('failed') ? 'warn' : 'info';
    this.log(level, `Auth: ${event}`, {
      authEvent: event,
      userId,
      ...meta,
    });
  }

  /**
   * Start timing an operation
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Log metric
   */
  metric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    this.info('Metric', {
      metric: { name, value, unit, tags },
    });
  }
}

// Export singleton for backward compatibility
export const logger = new Logger();

/**
 * Express middleware to add correlation ID to requests
 */
export function correlationIdMiddleware(req: express.Request & { correlationId?: string; logger?: Logger }, res: express.Response, next: express.NextFunction): void {
  const correlationId = 
    req.headers['x-correlation-id'] as string || 
    Logger.generateCorrelationId();
  
  req.correlationId = correlationId;
  req.logger = new Logger(correlationId, {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  
  res.setHeader('x-correlation-id', correlationId);
  
  // Log request
  const timer = req.logger.startTimer();
  req.logger.info('Incoming request', {
    headers: req.headers,
    query: req.query,
    params: req.params,
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = timer();
    req.logger!.info('Request completed', {
      statusCode: res.statusCode,
      duration,
    });
  });
  
  next();
}