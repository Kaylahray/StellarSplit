import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { TemplateService } from "./templates.service";
import { CreateTemplateDto } from "./dtos/create-template.dto";
import { UpdateTemplateDto } from "@/recurring-splits/recurring-splits.service";

@Controller("templates")
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Get("suggestions")
  async getSuggestions(
    @Req() req: any,
    @Query("participantCount") count?: number,
  ) {
    const userId = req.user.walletAddress;
    return this.templateService.getSuggestions(
      userId,
      count ? Number(count) : undefined,
    );
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(req.user.walletAddress, dto);
  }

  @Get("my-templates")
  async findAll(@Req() req: any) {
    return this.templateService.findAll(req.user.walletAddress);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Req() req: any,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, req.user.walletAddress, dto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Req() req: any) {
    return this.templateService.remove(id, req.user.walletAddress);
  }

  @Post(":id/pin")
  async togglePin(@Param("id") id: string, @Req() req: any) {
    return this.templateService.togglePin(id, req.user.walletAddress);
  }

  @Post(":id/use")
  async trackUsage(@Param("id") id: string, @Req() req: any) {
    return this.templateService.incrementUsage(id, req.user.walletAddress);
  }
}
