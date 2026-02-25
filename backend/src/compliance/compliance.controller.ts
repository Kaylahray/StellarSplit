import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ExpenseCategory } from './entities/expense-category.entity';

@Controller('api/compliance')
export class ComplianceController {
    constructor(private readonly complianceService: ComplianceService) { }

    @Post('export/request')
    async requestExport(@Body() data: any) {
        // In a real app, userId would come from auth guard
        const userId = data.userId;
        return this.complianceService.requestExport(userId, data);
    }

    @Get('export/:requestId/status')
    async getExportStatus(@Param('requestId') requestId: string) {
        return this.complianceService.getExportStatus(requestId);
    }

    @Get('categories')
    async getCategories(@Query('userId') userId: string) {
        return this.complianceService.getCategories(userId);
    }

    @Post('categories')
    async createCategory(@Body() data: any) {
        const userId = data.userId;
        return this.complianceService.createCategory(userId, data);
    }

    @Put('splits/:splitId/category')
    async assignCategory(@Param('splitId') splitId: string, @Body('categoryId') categoryId: string) {
        return this.complianceService.assignCategoryToSplit(splitId, categoryId);
    }

    @Get('summary')
    async getSummary(@Query('userId') userId: string, @Query('year') year: string) {
        return this.complianceService.getSummary(userId, parseInt(year));
    }

    @Get('tax-deductible-total')
    async getTaxDeductibleTotal(@Query('userId') userId: string, @Query('period') period: string) {
        return this.complianceService.getTaxDeductibleTotal(userId, period);
    }
}
