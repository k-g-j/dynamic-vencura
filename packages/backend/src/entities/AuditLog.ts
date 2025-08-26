import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  eventType!: string;

  @Column({ type: 'varchar', length: 20 })
  severity!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @Column({ type: 'uuid', nullable: true })
  walletId?: string;

  @Column({ type: 'varchar', nullable: true })
  transactionHash?: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', nullable: true })
  correlationId?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  error?: string;

  @CreateDateColumn()
  timestamp!: Date;
}