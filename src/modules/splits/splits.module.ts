import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Split } from './entities/split.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Split])],
  exports: [TypeOrmModule],
})
export class SplitsModule {}
