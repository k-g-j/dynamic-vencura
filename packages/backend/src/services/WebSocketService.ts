/**
 * WebSocket service for real-time transaction updates
 * 
 * Provides real-time notifications for:
 * - Transaction status changes
 * - Wallet balance updates
 * - Error notifications
 * - System alerts
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Logger } from '../utils/logger';

export enum WebSocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  AUTHENTICATED = 'authenticated',
  
  // Transaction events
  TRANSACTION_PENDING = 'transaction:pending',
  TRANSACTION_CONFIRMED = 'transaction:confirmed',
  TRANSACTION_FAILED = 'transaction:failed',
  TRANSACTION_UPDATE = 'transaction:update',
  
  // Wallet events
  WALLET_BALANCE_UPDATE = 'wallet:balance:update',
  WALLET_CREATED = 'wallet:created',
  
  // Error events
  ERROR = 'error',
  
  // System events
  SYSTEM_ALERT = 'system:alert',
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private userSockets: Map<string, Set<string>>; // userId -> socketIds
  private static instance: WebSocketService;

  private constructor(server: HttpServer) {
    this.logger = new Logger();
    this.userSockets = new Map();

    // Initialize Socket.IO with CORS configuration
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.CORS_ORIGIN.split(','),
        credentials: true,
      },
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Initialize WebSocket service (singleton)
   */
  static initialize(server: HttpServer): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(server);
    }
    return WebSocketService.instance;
  }

  /**
   * Get WebSocket service instance
   */
  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      throw new Error('WebSocketService not initialized. Call initialize() first.');
    }
    return WebSocketService.instance;
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract token from handshake auth
        const token = socket.handshake.auth['token'];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
          userId: string;
          email: string;
        };

        // Verify user exists
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({
          where: { id: decoded.userId },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.userId = user.id;
        socket.userEmail = user.email;

        next();
      } catch (error) {
        this.logger.error('WebSocket authentication failed', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on(WebSocketEvent.CONNECTION, (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      this.logger.info('WebSocket client connected', {
        userId: socket.userId,
        socketId: socket.id,
      });

      // Track user socket
      this.addUserSocket(socket.userId, socket.id);

      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Send authentication confirmation
      socket.emit(WebSocketEvent.AUTHENTICATED, {
        userId: socket.userId,
        socketId: socket.id,
      });

      // Handle disconnect
      socket.on(WebSocketEvent.DISCONNECT, () => {
        this.logger.info('WebSocket client disconnected', {
          userId: socket.userId,
          socketId: socket.id,
        });

        if (socket.userId) {
          this.removeUserSocket(socket.userId, socket.id);
        }
      });

      // Handle subscription to wallet updates
      socket.on('subscribe:wallet', (walletId: string) => {
        socket.join(`wallet:${walletId}`);
        this.logger.info('Client subscribed to wallet updates', {
          userId: socket.userId,
          walletId,
        });
      });

      // Handle unsubscription from wallet updates
      socket.on('unsubscribe:wallet', (walletId: string) => {
        socket.leave(`wallet:${walletId}`);
        this.logger.info('Client unsubscribed from wallet updates', {
          userId: socket.userId,
          walletId,
        });
      });
    });
  }

  /**
   * Track user socket connection
   */
  private addUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * Remove user socket connection
   */
  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get total connections count
   */
  getTotalConnectionsCount(): number {
    let total = 0;
    this.userSockets.forEach(sockets => {
      total += sockets.size;
    });
    return total;
  }

  /**
   * Emit transaction status update to user
   */
  emitTransactionUpdate(
    userId: string,
    transactionData: {
      walletId: string;
      transactionHash: string;
      status: 'pending' | 'confirmed' | 'failed';
      blockNumber?: number;
      gasUsed?: string;
      error?: string;
    }
  ): void {
    const event = this.getTransactionEvent(transactionData.status);
    
    // Emit to user room
    this.io.to(`user:${userId}`).emit(event, transactionData);
    
    // Also emit to wallet room
    this.io.to(`wallet:${transactionData.walletId}`).emit(event, transactionData);
    
    this.logger.info('Transaction update emitted', {
      userId,
      event,
      transactionHash: transactionData.transactionHash,
      status: transactionData.status,
    });
  }

  /**
   * Emit wallet balance update
   */
  emitBalanceUpdate(
    userId: string,
    walletId: string,
    balance: {
      balance: string;
      formattedBalance: string;
    }
  ): void {
    const data = {
      walletId,
      ...balance,
      timestamp: new Date().toISOString(),
    };

    // Emit to user room
    this.io.to(`user:${userId}`).emit(WebSocketEvent.WALLET_BALANCE_UPDATE, data);
    
    // Also emit to wallet room
    this.io.to(`wallet:${walletId}`).emit(WebSocketEvent.WALLET_BALANCE_UPDATE, data);
    
    this.logger.info('Balance update emitted', {
      userId,
      walletId,
      balance: balance.formattedBalance,
    });
  }

  /**
   * Emit wallet created event
   */
  emitWalletCreated(
    userId: string,
    walletData: {
      id: string;
      address: string;
      name: string;
    }
  ): void {
    this.io.to(`user:${userId}`).emit(WebSocketEvent.WALLET_CREATED, walletData);
    
    this.logger.info('Wallet created event emitted', {
      userId,
      walletId: walletData.id,
    });
  }

  /**
   * Emit error to specific user
   */
  emitError(
    userId: string,
    error: {
      code: string;
      message: string;
      details?: any;
    }
  ): void {
    this.io.to(`user:${userId}`).emit(WebSocketEvent.ERROR, error);
    
    this.logger.warn('Error emitted to user', {
      userId,
      error,
    });
  }

  /**
   * Broadcast system alert to all connected users
   */
  broadcastSystemAlert(alert: {
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }): void {
    this.io.emit(WebSocketEvent.SYSTEM_ALERT, alert);
    
    this.logger.info('System alert broadcast', alert);
    
  }

  /**
   * Get transaction event based on status
   */
  private getTransactionEvent(status: string): WebSocketEvent {
    switch (status) {
      case 'pending':
        return WebSocketEvent.TRANSACTION_PENDING;
      case 'confirmed':
        return WebSocketEvent.TRANSACTION_CONFIRMED;
      case 'failed':
        return WebSocketEvent.TRANSACTION_FAILED;
      default:
        return WebSocketEvent.TRANSACTION_UPDATE;
    }
  }

  /**
   * Get server statistics
   */
  getStatistics(): {
    connectedUsers: number;
    totalConnections: number;
    rooms: string[];
  } {
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());
    
    return {
      connectedUsers: this.getConnectedUsersCount(),
      totalConnections: this.getTotalConnectionsCount(),
      rooms: rooms.filter(room => !room.startsWith('/')), // Filter out socket IDs
    };
  }

  /**
   * Gracefully shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down WebSocket server...');
    
    // Notify all clients
    this.broadcastSystemAlert({
      type: 'warning',
      message: 'Server is shutting down for maintenance',
      timestamp: new Date().toISOString(),
    });

    // Close all connections
    this.io.disconnectSockets(true);
    
    // Close server
    await new Promise<void>((resolve) => {
      this.io.close(() => {
        this.logger.info('WebSocket server shut down successfully');
        resolve();
      });
    });
  }
}