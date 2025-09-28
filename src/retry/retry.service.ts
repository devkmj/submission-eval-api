import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import type { Producer } from 'kafkajs';

@Injectable()
export class RetryService {
  constructor(
    private prisma: PrismaService,
    private evaluationService: EvaluationService,
    @Inject('KAFKA_PRODUCER') private producer: Producer,
  ) {}

  @Cron('0 * * * *')
  async retryFailed() {
    const failed = await this.prisma.submission.findMany({
      where: { status: 'FAILED', retryCount: { lt: 3 } },
    });

    for (const sub of failed) {
      try {
        const result = await this.evaluationService.evaluateEssay(sub.submitText);

        await this.prisma.submission.update({
          where: { id: sub.id },
          data: {
            status: 'COMPLETED',
            score: result.score,
            feedback: result.feedback,
            highlights: result.highlights,
            retryCount: { increment: 1 },
          },
        });
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));

        await this.prisma.submission.update({
          where: { id: sub.id },
          data: {
            retryCount: { increment: 1 },
            status: 'FAILED',
          },
        });

        await this.producer.send({
          topic: 'api.failures',
          messages: [
            {
              value: JSON.stringify({
                traceId: sub.traceId,
                submissionId: sub.id,
                uri: 'retry-job',
                method: 'AUTO',
                message: e.message,
              }),
            },
          ],
        });
      }
    }
  }
}
