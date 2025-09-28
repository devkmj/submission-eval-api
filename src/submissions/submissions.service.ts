import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { MediaService } from '../media/media.service';
import { EvaluationService } from '../evaluation/evaluation.service';

// 안전한 하이라이트 유틸
const escapeHtml = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlightText(src: string, needles: string[]): string {
  const safe = escapeHtml(src);
  const sorted = [...needles].filter(Boolean).sort((a, b) => b.length - a.length);
  let out = safe;
  for (const n of sorted) {
    const re = new RegExp(escapeRegExp(escapeHtml(n)), 'gi');
    out = out.replace(re, (m) => `<b>${m}</b>`);
  }
  return out;
}

function toNumber(b: bigint | null | undefined): number | null {
  return b === null || b === undefined ? null : Number(b);
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * 특정 제출을 조회합니다.
   * @param id 제출 ID (number)
   * @returns 제출 데이터 또는 null
   */
  async create(createSubmissionDto: CreateSubmissionDto, videoFile?: Express.Multer.File) {
    const { studentId, studentName, componentType, submitText } = createSubmissionDto;
    const studentIdBig = BigInt(studentId);

    let mediaUrls: { video?: string; audio?: string } | undefined;

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // 학생 upsert
        await tx.student.upsert({
          where: { id: studentIdBig },
          update: { studentName },
          create: { id: studentIdBig, studentName },
        });

        // 제출 생성 (중복 제출 시 Prisma P2002 → BadRequestException 변환)
        let sub;
        try {
          sub = await tx.submission.create({
            data: { studentId: studentIdBig, componentType, submitText, status: 'PENDING' },
            include: { student: true }, // JOIN
          });
        } catch (e: unknown) {
          if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
            // 이미 동일 학생/컴포넌트 제출 기록이 있는 경우
            throw new BadRequestException('Already evaluated for this student and componentType.');
          }
          throw e;
        }

        // 영상 처리
        if (videoFile?.buffer?.length) {
          const keyPrefix = `submissions/${String(sub.id)}/${Date.now()}`;
          const uploadResult = (await this.mediaService.processAndUpload(videoFile, keyPrefix)) as {
            videoUrl: string;
            audioUrl: string;
            meta?: unknown;
          };
          const { videoUrl, audioUrl } = uploadResult;

          await tx.submissionMedia.create({
            data: {
              submissionId: sub.id,
              videoUrl,
              audioUrl,
              // meta, // meta 컬럼이 있으면 주석 해제
            },
          });

          mediaUrls = { video: videoUrl, audio: audioUrl }; // ⬅️ 재할당만
        }

        // AI 평가 & 하이라이트
        const started = Date.now();
        const evalRes: { score: number; feedback: string; highlights: string[] } =
          await this.evaluationService.evaluateEssay(submitText);
        const latency = Date.now() - started;
        const highlightHtml = highlightText(submitText, evalRes.highlights ?? []);

        await tx.submission.update({
          where: { id: sub.id },
          data: {
            status: 'COMPLETED',
            score: evalRes.score,
            feedback: evalRes.feedback,
            highlights: evalRes.highlights,
            highlightText: highlightHtml,
            apiLatencyMs: latency,
          },
        });

        // 응답(요구 포맷과 유사)
        return {
          studentId,
          studentName,
          status: 'COMPLETED',
          score: evalRes.score,
          feedback: evalRes.feedback,
          highlights: evalRes.highlights,
          submitText,
          highlightSubmitText: highlightHtml,
          mediaUrl: mediaUrls,
        };
      });
    } catch (e: unknown) {
      if (e instanceof PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Already evaluated for this student and componentType.');
      }
      if (e instanceof Error) {
        throw e;
      }
      throw new Error(String(e));
    }
  }

  async findAll(page = 1, size = 20) {
    const take = Math.max(1, Math.min(100, size));
    const skip = Math.max(0, (page - 1) * take);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { student: true }, // join
      }),
      this.prisma.submission.count(),
    ]);

    const itemsDto = items.map((it) => ({
      id: toNumber(it.id)!,
      studentId: toNumber(it.studentId)!,
      studentName: it.student.studentName, // 추가됨
      componentType: it.componentType,
      status: it.status,
      score: it.score ?? null,
      createdAt: it.createdAt,
    }));
    return { page, size: take, total, items: itemsDto };
  }

  async findOne(id: number) {
    const row = await this.prisma.submission.findUnique({
      where: { id: BigInt(id) },
      include: { student: true },
    });
    if (!row) return null;

    return {
      ...row,
      id: toNumber(row.id)!,
      studentId: toNumber(row.studentId)!,
    };
  }

  update(id: number, updateSubmissionDto: UpdateSubmissionDto) {
    return `Update submission from ${updateSubmissionDto.studentName}, text: ${updateSubmissionDto.submitText}`;
  }

  remove(id: number) {
    return `This action removes a #${id} submission`;
  }
}
