import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Split } from '../entities/split.entity';
import { Item } from '../entities/item.entity';
import { Participant } from '../entities/participant.entity';

/**
 * Search module providing full-text search capabilities
 * 
 * I'm injecting the repositories we need for searching:
 * - Split: main entity being searched
 * - Item: for searching item names within splits
 * - Participant: for filtering by participants
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Split, Item, Participant]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
