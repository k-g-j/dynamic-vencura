import { AuditService, AuditEventType, AuditSeverity } from '../AuditService';
import { AppDataSource } from '../../config/database';
import { logger } from '../../utils/logger';

jest.mock('../../config/database');
jest.mock('../../utils/logger');

describe('AuditService', () => {
  let auditService: AuditService;
  let mockAuditLogRepository: any;

  beforeEach(() => {
    mockAuditLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation(() => mockAuditLogRepository);
    
    // Reset singleton instance
    (AuditService as any).instance = undefined;
    auditService = AuditService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AuditService.getInstance();
      const instance2 = AuditService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('logAuthEvent', () => {
    it('should log authentication success event', async () => {
      const mockAuditLog = {
        id: 'audit-id',
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        userId: 'user-id',
        metadata: { email: 'test@example.com' },
        createdAt: new Date(),
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.logAuthEvent(
        AuditEventType.AUTH_LOGIN_SUCCESS,
        'user-id',
        { email: 'test@example.com' }
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        eventType: AuditEventType.AUTH_LOGIN_SUCCESS,
        severity: AuditSeverity.INFO,
        userId: 'user-id',
        metadata: { email: 'test@example.com' },
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should log authentication failure event', async () => {
      const mockAuditLog = {
        id: 'audit-id',
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        userId: undefined,
        metadata: { reason: 'invalid_token' },
        createdAt: new Date(),
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.logAuthEvent(
        AuditEventType.AUTH_LOGIN_FAILED,
        undefined,
        { reason: 'invalid_token' }
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        eventType: AuditEventType.AUTH_LOGIN_FAILED,
        severity: AuditSeverity.INFO,
        userId: undefined,
        metadata: { reason: 'invalid_token' },
      });
      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database error');
      mockAuditLogRepository.save.mockRejectedValue(error);

      await auditService.logAuthEvent(
        AuditEventType.AUTH_LOGIN_SUCCESS,
        'user-id',
        {}
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save audit log',
        error
      );
    });
  });


  describe('logTransactionOperation', () => {
    it('should log transaction initiation', async () => {
      const mockAuditLog = {
        id: 'audit-id',
        eventType: AuditEventType.TRANSACTION_INITIATED,
        userId: 'user-id',
        walletId: 'wallet-id',
        transactionHash: '0xabc',
        metadata: { to: '0x456', amount: '1000' },
        createdAt: new Date(),
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.logTransactionOperation(
        AuditEventType.TRANSACTION_INITIATED,
        'user-id',
        'wallet-id',
        '0xabc',
        { to: '0x456', amount: '1000' }
      );

      expect(mockAuditLogRepository.create).toHaveBeenCalledWith({
        eventType: AuditEventType.TRANSACTION_INITIATED,
        severity: AuditSeverity.INFO,
        userId: 'user-id',
        walletId: 'wallet-id',
        transactionHash: '0xabc',
        metadata: { to: '0x456', amount: '1000' },
      });
    });

    it('should log transaction confirmation', async () => {
      const mockAuditLog = {
        id: 'audit-id',
        eventType: AuditEventType.TRANSACTION_CONFIRMED,
        userId: 'user-id',
        walletId: 'wallet-id',
        transactionHash: '0xdef',
        metadata: { blockNumber: 12345, gasUsed: '21000' },
        createdAt: new Date(),
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.logTransactionOperation(
        AuditEventType.TRANSACTION_CONFIRMED,
        'user-id',
        'wallet-id',
        '0xdef',
        { blockNumber: 12345, gasUsed: '21000' }
      );

      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });

    it('should log transaction failure', async () => {
      const mockAuditLog = {
        id: 'audit-id',
        eventType: AuditEventType.TRANSACTION_FAILED,
        userId: 'user-id',
        walletId: 'wallet-id',
        transactionHash: '0xghi',
        metadata: { reason: 'insufficient funds' },
        createdAt: new Date(),
      };

      mockAuditLogRepository.create.mockReturnValue(mockAuditLog);
      mockAuditLogRepository.save.mockResolvedValue(mockAuditLog);

      await auditService.logTransactionOperation(
        AuditEventType.TRANSACTION_FAILED,
        'user-id',
        'wallet-id',
        '0xghi',
        { reason: 'insufficient funds' }
      );

      expect(mockAuditLogRepository.save).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs for user', async () => {
      const mockLogs = [
        { id: '1', eventType: AuditEventType.AUTH_LOGIN_SUCCESS },
        { id: '2', eventType: AuditEventType.WALLET_CREATED },
      ];

      mockAuditLogRepository.find.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs('user-id');

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should filter by event type', async () => {
      const mockLogs = [
        { id: '1', eventType: AuditEventType.TRANSACTION_INITIATED },
      ];

      mockAuditLogRepository.find.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs(
        'user-id',
        AuditEventType.TRANSACTION_INITIATED
      );

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { 
          userId: 'user-id',
          eventType: AuditEventType.TRANSACTION_INITIATED,
        },
        order: { timestamp: 'DESC' },
        take: 100,
      });
      expect(result).toEqual(mockLogs);
    });

    it('should limit results', async () => {
      const mockLogs = Array(50).fill({ id: '1' });
      mockAuditLogRepository.find.mockResolvedValue(mockLogs);

      const result = await auditService.getAuditLogs('user-id', undefined, 50);

      expect(mockAuditLogRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { timestamp: 'DESC' },
        take: 50,
      });
      expect(result).toHaveLength(50);
    });
  });

  describe('getAuditLogStats', () => {
    it('should return audit statistics', async () => {
      mockAuditLogRepository.count.mockImplementation((options: any) => {
        if (options.where.eventType === AuditEventType.AUTH_LOGIN_SUCCESS) return 10;
        if (options.where.eventType === AuditEventType.TRANSACTION_INITIATED) return 5;
        return 0;
      });

      const result = await auditService.getAuditLogStats('user-id');

      expect(result).toEqual({
        totalLogins: 10,
        totalTransactions: 5,
        totalWalletOperations: 0,
      });
    });
  });
});