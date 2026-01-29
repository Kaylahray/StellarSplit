import { IsString, IsOptional, IsNumber, IsArray, IsDateString, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filter options for split search
 * Allows narrowing results by date, amount, status and participants
 */
export class SearchFiltersDto {
  @ApiPropertyOptional({ description: 'Filter splits created on or after this date' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter splits created on or before this date' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Minimum total amount filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum total amount filter' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @ApiPropertyOptional({ 
    description: 'Filter by split status',
    type: [String],
    example: ['active', 'completed']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ 
    description: 'Filter by participant user IDs',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participants?: string[];
}

/**
 * Main search request DTO
 * I'm keeping this flexible to handle various search scenarios
 */
export class SearchSplitsDto {
  @ApiProperty({ 
    description: 'Search query for full-text search across split descriptions and item names',
    example: 'dinner restaurant'
  })
  @IsString()
  query!: string;

  @ApiPropertyOptional({ 
    description: 'Advanced filter options',
    type: SearchFiltersDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({ 
    description: 'Sort option: createdAt_desc, createdAt_asc, amount_desc, amount_asc',
    default: 'createdAt_desc'
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ 
    description: 'Number of results to return',
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ 
    description: 'Cursor for pagination (base64 encoded)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
