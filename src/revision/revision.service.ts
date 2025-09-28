// src/revision/revision.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { RevisionDetailResponse } from './dto/create-revision.dto';

@Injectable()
export class RevisionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluationService: EvaluationService,
  ) {}

  async reEvaluate(submissionId: string) {
    const id = BigInt(submissionId);
    const submission = await this.prisma.submission.findUnique({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    // 기존 제출 텍스트 재평가
    const evalResult = await this.evaluationService.evaluateEssay(submission.submitText);

    // 제출 상태 업데이트
    await this.prisma.submission.update({
      where: { id },
      data: {
        score: evalResult.score,
        feedback: evalResult.feedback,
        highlights: evalResult.highlights,
        updatedAt: new Date(),
      },
    });

    // Revision 로그 기록
    await this.prisma.revision.create({
      data: {
        submissionId: id,
        score: evalResult.score,
        feedback: evalResult.feedback,
        highlights: evalResult.highlights,
      },
    });

    return {
      result: 'ok',
      submissionId,
      ...evalResult,
    };
  }

  async getRevisions(page = 1, size = 20, sort: 'asc' | 'desc' = 'desc') {
    const skip = (page - 1) * size;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.revision.findMany({
        skip,
        take: size,
        orderBy: { createdAt: sort },
      }),
      this.prisma.revision.count(),
    ]);

    return {
      result: 'ok' as const,
      page,
      size,
      total,
      items,
    };
  }

  async getRevisionDetail(revisionId: string): Promise<RevisionDetailResponse> {
    const id = BigInt(revisionId);
    const revision = await this.prisma.revision.findUnique({ where: { id } });

    if (!revision) {
      return {
        result: 'failed',
        message: `Revision ${revisionId} not found`,
        revision: null,
      };
    }

    return {
      result: 'ok' as const,
      message: null,
      revision,
    };
  }
}
