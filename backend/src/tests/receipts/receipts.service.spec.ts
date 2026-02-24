import { ReceiptsService } from '../../receipts/receipts.service';
import { Repository } from 'typeorm';
import { Receipt } from '../../receipts/entities/receipt.entity';

describe('ReceiptsService', () => {
  let service: ReceiptsService;
  let repoMock: Partial<Repository<Receipt>>;
  let storageMock: any;
  let thumbnailsMock: any;

  beforeEach(() => {
    repoMock = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    storageMock = {
      saveFile: jest.fn(),
      getSignedUrl: jest.fn(),
      deleteFile: jest.fn(),
    };
    thumbnailsMock = {
      generateThumbnail: jest.fn(),
      convertHeicToJpg: jest.fn(),
    };

    service = new ReceiptsService(
      repoMock as any,
      storageMock,
      thumbnailsMock,
    );
  });

  it('should validate file type and size', async () => {
    const file: any = { mimetype: 'image/jpeg', size: 1024, originalname: 'test.jpg', buffer: Buffer.from('') };
    storageMock.saveFile.mockResolvedValue('receipts/test.jpg');
    thumbnailsMock.generateThumbnail.mockResolvedValue('thumbnails/test.jpg');
    repoMock.create.mockReturnValue(file);
    repoMock.save.mockResolvedValue(file);

    const result = await service.upload('split1', file, 'wallet123');
    expect(storageMock.saveFile).toHaveBeenCalled();
    expect(thumbnailsMock.generateThumbnail).toHaveBeenCalled();
    expect(repoMock.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should reject unsupported file type', async () => {
    const file: any = { mimetype: 'text/plain', size: 1024 };
    await expect(service.upload('split1', file, 'wallet123')).rejects.toThrow('Unsupported file type');
  });

  it('should reject oversized file', async () => {
    const file: any = { mimetype: 'image/jpeg', size: 20 * 1024 * 1024 };
    await expect(service.upload('split1', file, 'wallet123')).rejects.toThrow('File exceeds 15MB limit');
  });

  it('should return signed URL', async () => {
    const receipt = { id: 'r1', storagePath: 'receipts/test.jpg' } as Receipt;
    repoMock.findOne.mockResolvedValue(receipt);
    storageMock.getSignedUrl.mockReturnValue('signed-url');

    const url = await service.getSignedUrl('r1');
    expect(url).toBe('signed-url');
  });

  it('should soft delete receipt', async () => {
    await service.softDelete('r1');
    expect(repoMock.update).toHaveBeenCalledWith('r1', { isDeleted: true });
  });

  it('should return OCR data', async () => {
    const receipt = { id: 'r1', ocrProcessed: true, extractedData: { text: 'sample' } } as Receipt;
    repoMock.findOne.mockResolvedValue(receipt);

    const data = await service.getOcrData('r1');
    expect(data).toEqual({ processed: true, data: { text: 'sample' } });
  });

  it('should reprocess OCR', async () => {
    await service.reprocessOcr('r1');
    expect(repoMock.update).toHaveBeenCalledWith('r1', expect.objectContaining({ ocrProcessed: true }));
  });
});
