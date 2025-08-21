import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { Logger } from '../utils/logger';

/**
 * Request/Response logging middleware for API monitoring and debugging
 * 
 * Logs:
 * - Request method, URL, and headers
 * - Request body (with sensitive data redacted)
 * - Response status and duration
 * - User ID if authenticated
 */
export function requestLogger(req: AuthRequest, res: Response, next: NextFunction): void {
  const logger = req.logger || new Logger();
  const start = Date.now();
  
  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Redact sensitive fields from request body
  const redactedBody = redactSensitiveData(req.body);
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    body: redactedBody,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-forwarded-for': req.headers['x-forwarded-for'],
    },
    ip: req.ip,
    userId: req.user?.id,
  });
  
  // Override response methods to capture response data
  res.send = function(body: any): Response {
    logResponse(body);
    return originalSend.call(this, body);
  };
  
  res.json = function(body: any): Response {
    logResponse(body);
    return originalJson.call(this, body);
  };
  
  // Log response details
  function logResponse(body: any): void {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    logger[level]('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      responseSize: JSON.stringify(body).length,
      // Only log error responses body for debugging
      ...(res.statusCode >= 400 && { responseBody: body }),
    });
  }
  
  next();
}

/**
 * Redacts sensitive data from request bodies
 * 
 * @param data - Data to redact sensitive fields from
 * @returns Redacted data safe for logging
 */
function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'privateKey',
    'encryptedPrivateKey',
    'secret',
    'apiKey',
    'authorization',
    'signature',
  ];
  
  const redacted = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  // Recursively redact nested objects
  for (const key in redacted) {
    if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }
  
  return redacted;
}

/**
 * Error logging middleware for unhandled errors
 * 
 * Logs full error details for debugging while returning safe error messages to clients
 */
export function errorLogger(err: Error, req: AuthRequest, _res: Response, next: NextFunction): void {
  const logger = req.logger || new Logger();
  
  logger.error('Unhandled error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      body: redactSensitiveData(req.body),
      userId: req.user?.id,
    },
  });
  
  // Pass to next error handler
  next(err);
}