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

  @Column()
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ unique: true })
  @Index()
  transactionHash!: string;

  @Column()
  @Index()
  from!: string;

  @Column()
  @Index()
  to!: string;

  @Column({ type: 'decimal', precision: 78, scale: 18 })
  amount!: string;

  @Column({ nullable: true })
  gasUsed?: string;

  @Column({ nullable: true })
  gasPrice?: string;

  @Column({ nullable: true })
  blockNumber?: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
  })
  @Index()
  status!: 'pending' | 'confirmed' | 'failed';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}