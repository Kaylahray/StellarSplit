import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';

@Injectable()
export class ThumbnailService {
  async generateThumbnail(file: Express.Multer.File): Promise<string> {
    const buffer = await sharp(file.buffer).resize(200).toBuffer();
    const path = `thumbnails/${Date.now()}-${file.originalname}.jpg`;
    // Save thumbnail to storage (local or S3)
    return path;
  }

  async convertHeicToJpg(file: Express.Multer.File): Promise<Express.Multer.File> {
    const buffer = await sharp(file.buffer).jpeg().toBuffer();
    return {
      ...file,
      buffer,
      mimetype: 'image/jpeg',
      originalname: file.originalname.replace(/\.heic$/i, '.jpg'),
    };
  }
}
