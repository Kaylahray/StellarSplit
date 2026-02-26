import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DevicePlatform {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('device_registrations')
export class DeviceRegistration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  deviceToken!: string;

  @Column({
    type: 'enum',
    enum: DevicePlatform,
    enumName: 'device_platform_enum',
  })
  platform!: DevicePlatform;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
