import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ type: 'varchar', unique: true })
  @Index()
  transactionHash!: string;

  @Column({ type: 'varchar' })
  @Index()
  from!: string;

  @Column({ type: 'varchar' })
  @Index()
  to!: string;

  @Column({ 
    type: 'varchar',
    transformer: {
      to: (value: string) => value,
      from: (value: string) => value ? String(value) : '0'
    }
  })
  amount!: string;

  @Column({ type: 'varchar', nullable: true })
  gasUsed?: string;

  @Column({ type: 'varchar', nullable: true })
  gasPrice?: string;

  @Column({ type: 'integer', nullable: true })
  blockNumber?: number;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  @Index()
  status!: 'pending' | 'confirmed' | 'failed';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}