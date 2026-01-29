import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchSplitsDto } from './dto/search-splits.dto';
import { SearchResultDto } from './dto/search-result.dto';

/**
 * Controller for search endpoints
 * I'm keeping this focused on splits for now, but the structure
 * allows easy extension to search participants/transactions separately
 */
@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('splits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Search splits with full-text search and filters',
    description: `
      Performs full-text search across split descriptions and item names.
      Supports fuzzy matching for typo tolerance.
      
      **Filters:**
      - Date range (dateFrom, dateTo)
      - Amount range (minAmount, maxAmount)
      - Status (active, completed, partial)
      - Participants (user IDs)
      
      **Sorting:**
      - createdAt_desc (default)
      - createdAt_asc
      - amount_desc
      - amount_asc
      
      **Pagination:**
      Uses cursor-based pagination for stable results.
      Pass the cursor from the previous response to get the next page.
    `
  })
  @ApiBody({ type: SearchSplitsDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Search results with highlighted matches',
    type: SearchResultDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid search parameters',
  })
  async searchSplits(
    @Body(new ValidationPipe({ transform: true, whitelist: true })) 
    searchDto: SearchSplitsDto,
  ): Promise<SearchResultDto> {
    return this.searchService.searchSplits(searchDto);
  }
}
