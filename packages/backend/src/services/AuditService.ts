import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { logger } from '../utils/logger';

export enum AuditEventType {
  AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  WALLET_CREATED = 'WALLET_CREATED',
  TRANSACTION_INITIATED = 'TRANSACTION_INITIATED',
  TRANSACTION_CONFIRMED = 'TRANSACTION_CONFIRMED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  MESSAGE_SIGNED = 'MESSAGE_SIGNED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export class AuditService {
  private auditRepository: Repository<AuditLog>;
  private static instance: AuditService;

  private constructor() {
    this.auditRepository = AppDataSource.getRepository(AuditLog);
  }

  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logAuthEvent(
    eventType: AuditEventType,
    userId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const auditLog = this.auditRepository.create({
        eventType,
        severity: AuditSeverity.INFO,
        userId,
        metadata,
      });
      await this.auditRepository.save(auditLog);
    } catch (error) {
      logger.error('Failed to save audit log', error);
    }
  }

  async logTransactionOperation(
    eventType: AuditEventType,
    userId: string,
    walletId: string,
    transactionHash?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const severity = eventType === AuditEventType.TRANSACTION_FAILED 
        ? AuditSeverity.ERROR 
        : AuditSeverity.INFO;
      
      const auditLog = this.auditRepository.create({
        eventType,
        severity,
        userId,
        walletId,
        transactionHash,
        metadata,
      });
      await this.auditRepository.save(auditLog);
    } catch (error) {
      logger.error('Failed to save audit log', error);
    }
  }

  async getAuditLogs(
    userId: string,
    eventType?: AuditEventType,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = { userId };
    if (eventType) {
      where['eventType'] = eventType;
    }

    return this.auditRepository.find({
      where,
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getAuditLogStats(userId: string): Promise<{
    totalLogins: number;
    totalTransactions: number;
    totalWalletOperations: number;
  }> {
    const totalLogins = await this.auditRepository.count({
      where: { userId, eventType: AuditEventType.AUTH_LOGIN_SUCCESS },
    });

    const totalTransactions = await this.auditRepository.count({
      where: { userId, eventType: AuditEventType.TRANSACTION_INITIATED },
    });

    const totalWalletOperations = await this.auditRepository.count({
      where: { userId, eventType: AuditEventType.WALLET_CREATED },
    });

    return {
      totalLogins,
      totalTransactions,
      totalWalletOperations,
    };
  }
}