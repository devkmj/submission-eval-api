import { InternalServerErrorException } from '@nestjs/common';
import { MediaService } from './media.service';
import * as fs from 'fs-extra';

// --- 모듈 mocking ---
jest.mock('fs-extra', () => {
  return {
    writeFile: jest
      .fn<ReturnType<typeof fs.writeFile>, Parameters<typeof fs.writeFile>>()
      .mockResolvedValue(undefined),
  };
});
jest.mock('tmp', () => ({
  dirSync: jest.fn(() => ({
    name: '/tmp/mockdir',
    removeCallback: jest.fn(),
  })),
}));
jest.mock('fluent-ffmpeg', () => {
  const mockChain = {
    noAudio: jest.fn().mockReturnThis(),
    noVideo: jest.fn().mockReturnThis(),
    output: jest.fn().mockReturnThis(),
    on: (event: string, cb: () => void) => {
      if (event === 'end') setImmediate(cb);
      return mockChain;
    },
    run: jest.fn(),
  };
  const mockFn = () => mockChain;
  (mockFn as any).setFfmpegPath = jest.fn();
  return mockFn;
});
jest.mock('@azure/storage-blob', () => {
  return {
    BlobServiceClient: {
      fromConnectionString: jest.fn(() => ({
        getContainerClient: jest.fn(() => ({
          createIfNotExists: jest.fn(),
          getBlockBlobClient: jest.fn((name: string) => ({
            name,
            containerName: 'task',
            url: `https://mock.blob/${name}`,
            uploadFile: jest.fn().mockResolvedValue(undefined),
          })),
        })),
      })),
    },
    generateBlobSASQueryParameters: jest.fn(() => 'sig=mock'),
    StorageSharedKeyCredential: jest.fn(),
    BlobSASPermissions: { parse: jest.fn(() => ({ read: true })) },
    SASProtocol: { Https: 'https' },
  };
});

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    process.env.AZURE_CONNECTION_STRING =
      'AccountName=test;AccountKey=12345;EndpointSuffix=core.windows.net';
    process.env.AZURE_CONTAINER = 'task';
    service = new MediaService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.AZURE_CONNECTION_STRING;
    delete process.env.AZURE_CONTAINER;
  });

  it('정상 처리 시 videoUrl/audioUrl 반환', async () => {
    const file = { buffer: Buffer.from('fake') } as Express.Multer.File;

    const result = await service.processAndUpload(file, 'test/prefix');

    expect(result.videoUrl).toContain('sig=mock');
    expect(result.audioUrl).toContain('sig=mock');
  });

  it('fs.writeFile 에러 시 InternalServerErrorException 발생', async () => {
    const file = { buffer: Buffer.from('fake') } as Express.Multer.File;
    const mockedWriteFile = fs.writeFile;
    mockedWriteFile.mockRejectedValueOnce(new Error('disk full'));

    await expect(service.processAndUpload(file, 'test/prefix')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
