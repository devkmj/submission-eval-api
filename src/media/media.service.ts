import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ffmpegPath from 'ffmpeg-static';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import * as tmp from 'tmp';
import * as fs from 'fs-extra';
import * as path from 'path';
import ffmpeg, { FfmpegCommand } from 'fluent-ffmpeg';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  throw new Error('ffmpeg binary not found. Install ffmpeg-static or check your environment.');
}

@Injectable()
export class MediaService {
  private readonly blob = BlobServiceClient.fromConnectionString(
    process.env.AZURE_CONNECTION_STRING!,
  );
  private readonly container = this.blob.getContainerClient(process.env.AZURE_CONTAINER || 'task');

  private getSharedKeyCred() {
    const accountName = /AccountName=([^;]+)/.exec(process.env.AZURE_CONNECTION_STRING!)?.[1];
    const accountKey = /AccountKey=([^;]+)/.exec(process.env.AZURE_CONNECTION_STRING!)?.[1];
    return new StorageSharedKeyCredential(<string>accountName, <string>accountKey);
  }

  async processAndUpload(file: Express.Multer.File, objectKeyPrefix: string) {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const srcPath = path.join(tmpDir.name, 'src.mp4');
    const outMp4 = path.join(tmpDir.name, 'out_silent.mp4');
    const outMp3 = path.join(tmpDir.name, 'out_audio.mp3');

    try {
      await fs.writeFile(srcPath, file.buffer);

      // 1) 무음 MP4 생성
      await new Promise<void>((resolve, reject) => {
        const cmd: FfmpegCommand = ffmpeg(srcPath);
        cmd
          .noAudio()
          .output(outMp4)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      // 2) 오디오만 추출
      await new Promise<void>((resolve, reject) => {
        const cmd: FfmpegCommand = ffmpeg(srcPath);
        cmd
          .noVideo()
          .output(outMp3)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      // 3) Blob 업로드
      await this.container.createIfNotExists();
      const videoBlob = this.container.getBlockBlobClient(`${objectKeyPrefix}.mp4`);
      const audioBlob = this.container.getBlockBlobClient(`${objectKeyPrefix}.mp3`);

      await videoBlob.uploadFile(outMp4, { blobHTTPHeaders: { blobContentType: 'video/mp4' } });
      await audioBlob.uploadFile(outMp3, { blobHTTPHeaders: { blobContentType: 'audio/mpeg' } });

      // 4) SAS URL 발급
      const cred = this.getSharedKeyCred();
      const startsOn = new Date(Date.now() - 5 * 60 * 1000);
      const expiresOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const perms = BlobSASPermissions.parse('r');

      const videoSas = generateBlobSASQueryParameters(
        {
          containerName: videoBlob.containerName,
          blobName: videoBlob.name,
          permissions: perms,
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        cred,
      ).toString();

      const audioSas = generateBlobSASQueryParameters(
        {
          containerName: audioBlob.containerName,
          blobName: audioBlob.name,
          permissions: perms,
          startsOn,
          expiresOn,
          protocol: SASProtocol.Https,
        },
        cred,
      ).toString();

      return {
        videoUrl: `${videoBlob.url}?${videoSas}`,
        audioUrl: `${audioBlob.url}?${audioSas}`,
      };
    } catch (e) {
      if (e instanceof Error) {
        throw new InternalServerErrorException(e.message);
      }
      throw new InternalServerErrorException('Unknown error');
    } finally {
      tmpDir.removeCallback();
    }
  }
}
