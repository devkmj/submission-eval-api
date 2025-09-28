import { Test, TestingModule } from '@nestjs/testing';
import { RetryService } from './retry.service';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from '../evaluation/evaluation.service';

describe('RetryService', () => {
  let service: RetryService;
  let prisma: { submission: { findMany: jest.Mock; update: jest.Mock } };
  let evaluationService: { evaluateEssay: jest.Mock };
  let producerMock: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      submission: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    evaluationService = {
      evaluateEssay: jest.fn(),
    };

    producerMock = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetryService,
        { provide: PrismaService, useValue: prisma },
        { provide: EvaluationService, useValue: evaluationService },
        { provide: 'KAFKA_PRODUCER', useValue: producerMock }, // 👈 주입
      ],
    }).compile();

    service = module.get<RetryService>(RetryService);
  });

  it('FAILED + retryCount < 3 → 재시도 성공 시 COMPLETED로 업데이트', async () => {
    prisma.submission.findMany.mockResolvedValue([
      { id: 1, status: 'FAILED', retryCount: 0, submitText: 'abc', componentType: 'Essay' },
    ]);
    evaluationService.evaluateEssay.mockResolvedValue({
      score: 5,
      feedback: 'ok',
      highlights: [],
    });

    await service.retryFailed();

    expect(prisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'COMPLETED', score: 5 }),
      }),
    );
    expect(producerMock.send).not.toHaveBeenCalled();
  });

  it('재시도 실패 시 retryCount 증가 + FAILED 유지 + Kafka 알림 전송', async () => {
    prisma.submission.findMany.mockResolvedValue([
      { id: 2, status: 'FAILED', retryCount: 0, submitText: 'xyz', componentType: 'Essay' },
    ]);
    evaluationService.evaluateEssay.mockRejectedValue(new Error('AI error'));

    await service.retryFailed();

    expect(prisma.submission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({
          retryCount: { increment: 1 },
          status: 'FAILED',
        }),
      }),
    );
    expect(producerMock.send).toHaveBeenCalled(); // 👈 Kafka 전송 검증
  });
});
