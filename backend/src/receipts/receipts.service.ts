import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { StorageProviderService } from './storage-provider.service';
import { ThumbnailService } from './thumbnail.service';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt) private readonly repo: Repository<Receipt>,
    private readonly storage: StorageProviderService,
    private readonly thumbnails: ThumbnailService,
  ) {}

  private validateFile(file: Express.Multer.File) {
    const allowed = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 15MB limit');
    }
  }

  async upload(splitId: string, file: Express.Multer.File, uploadedBy: string) {
    this.validateFile(file);

    // Convert HEIC to JPG if needed
    let processedFile = file;
    if (file.mimetype === 'image/heic') {
      processedFile = await this.thumbnails.convertHeicToJpg(file);
    }

    const storagePath = await this.storage.saveFile(processedFile);

    const thumbnailPath = await this.thumbnails.generateThumbnail(processedFile);

    const receipt = this.repo.create({
      splitId,
      uploadedBy,
      originalFilename: file.originalname,
      storagePath,
      fileSize: file.size,
      mimeType: processedFile.mimetype,
      thumbnailPath,
    });

    return this.repo.save(receipt);
  }

  async listBySplit(splitId: string) {
    return this.repo.find({ where: { splitId, isDeleted: false } });
  }

  async getSignedUrl(receiptId: string) {
    const receipt = await this.repo.findOne({ where: { id: receiptId } });
    return this.storage.getSignedUrl(receipt.storagePath, 3600); // 1 hour expiry
  }

  async softDelete(receiptId: string) {
    await this.repo.update(receiptId, { isDeleted: true });
  }

  async getOcrData(receiptId: string) {
    const receipt = await this.repo.findOne({ where: { id: receiptId } });
    return { processed: receipt.ocrProcessed, data: receipt.extractedData };
  }

  async reprocessOcr(receiptId: string) {
    // call OCR engine, update receipt
    await this.repo.update(receiptId, {
      ocrProcessed: true,
      ocrConfidenceScore: 0.95,
      extractedData: { text: 'Sample OCR result' },
    });
  }

  // Scheduled job: permanently delete after 30 days
  async permanentCleanup() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const receipts = await this.repo.find({
      where: { isDeleted: true, createdAt: cutoff },
    });
    for (const r of receipts) {
      await this.storage.deleteFile(r.storagePath);
      await this.repo.delete(r.id);
    }
  }
}
