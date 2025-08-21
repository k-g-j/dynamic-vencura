import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './Wallet';

@Entity('signed_messages')
export class SignedMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  walletId!: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.signedMessages)
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text' })
  signature!: string;

  @CreateDateColumn()
  createdAt!: Date;
}