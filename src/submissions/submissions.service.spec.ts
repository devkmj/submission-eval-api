import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ComponentType } from '../common/enums/component-type';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: PrismaService;
  let evalService: EvaluationService;

  // 테스트용 가짜 Prisma 객체(메서드 시그니처만 빌드)
  const buildTx = (): Prisma.TransactionClient =>
    ({
      student: { upsert: jest.fn() },
      submission: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      submissionMedia: { create: jest.fn() },
      // 트랜잭션 클라이언트 최소형 (사용 안 해도 존재만)
      $use: jest.fn(),
      $on: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    }) as unknown as Prisma.TransactionClient;

  const $transactionImpl: PrismaService['$transaction'] = ((arg: unknown) => {
    // 배열 오버로드: prisma.$transaction([p1, p2, ...])
    if (Array.isArray(arg)) {
      // NOTE: findMany/count가 mockResolvedValue로 promise를 내도록 세팅되지 않은 경우도
      // 안전하게 동작하게 Promise.all에 그대로 통과
      return Promise.all(arg as any) as any;
    }

    // 콜백 오버로드: prisma.$transaction((tx) => ...)
    if (typeof arg === 'function') {
      const tx = buildTx();
      const cb = arg as (tx: Prisma.TransactionClient) => Promise<unknown>;
      const ret = cb(tx);
      return (ret instanceof Promise ? ret : Promise.resolve(ret)) as any;
    }

    // 예외 케이스 방어
    return Promise.resolve([]) as any;
  }) as PrismaService['$transaction'];

  const prismaMock: Partial<PrismaService> = {
    $transaction: jest.fn($transactionImpl) as unknown as PrismaService['$transaction'],
    student: { upsert: jest.fn() } as any,
    submission: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    } as any,
    submissionMedia: { create: jest.fn() } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MediaService, useValue: { processAndUpload: jest.fn() } },
        {
          provide: EvaluationService,
          useValue: {
            evaluateEssay: jest.fn().mockResolvedValue({
              score: 5,
              feedback: 'Good job',
              highlights: ['test'],
            }),
          },
        },
      ],
    }).compile();

    service = module.get(SubmissionsService);
    prisma = module.get(PrismaService); // ✅ 실제 타입으로 받기
    evalService = module.get(EvaluationService); // ✅ 실제 타입으로 받기

    // 매 테스트마다 모킹 초기화
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('정상 제출 시 평가 포함 결과 반환', async () => {
      // 트랜잭션 내부에서 사용하는 tx.* 메서드가 prisma.* 스파이와 동일 인스턴스를 참조하도록 재정의
      jest.spyOn(prisma.student, 'upsert' as any).mockResolvedValue({
        id: 1n,
        studentName: '홍길동',
      });

      jest.spyOn(prisma.submission, 'create' as any).mockResolvedValue({
        id: 1n,
        studentId: 1n,
        componentType: 'Essay',
        submitText: 'test',
        status: 'PENDING',
        student: { studentName: '홍길동' },
      });

      jest.spyOn(prisma.submission, 'update' as any).mockResolvedValue({
        id: 1n,
        studentId: 1n,
        status: 'COMPLETED',
        score: 5,
        feedback: 'Good job',
        highlights: ['test'],
        highlightText: '<b>test</b>',
      });

      const evaluateEssaySpy = jest.spyOn(evalService, 'evaluateEssay');

      const result = await service.create({
        studentId: 1,
        studentName: '홍길동',
        componentType: ComponentType.ESSAY_WRITING,
        submitText: 'test',
      });

      expect(result).toHaveProperty('score', 5);
      expect(result).toHaveProperty('feedback', 'Good job');
      expect(evaluateEssaySpy).toHaveBeenCalled();
    });

    it('중복 제출 시 BadRequestException', async () => {
      // 트랜잭션 콜백 안에서 create가 호출되므로, tx.submission.create도 에러를 던지도록 설정
      // 위에서 $transaction은 tx를 만들어 콜백에 넘기므로, 그 tx의 메서드를 세팅해야 한다.
      // 간단히 $transaction 모킹을 덮어써서 tx.submission.create가 P2002를 던지게 구성
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => {
        const tx = {
          student: {
            upsert: jest.fn().mockResolvedValue({ id: 1n, studentName: '홍길동' }),
          },
          submission: {
            create: jest.fn().mockImplementation(() => {
              throw new PrismaClientKnownRequestError('Unique constraint', {
                code: 'P2002',
                clientVersion: 'test',
              } as any);
            }),
          },
        };
        return (cb as (tx: Prisma.TransactionClient) => unknown)(
          tx as unknown as Prisma.TransactionClient,
        );
      });

      await expect(
        service.create({
          studentId: 1,
          studentName: '홍길동',
          componentType: ComponentType.ESSAY_WRITING,
          submitText: 'test',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  it('조회 시 studentName 포함 반환', async () => {
    const findManySpy = jest.spyOn(prisma.submission, 'findMany' as any);
    const countSpy = jest.spyOn(prisma.submission, 'count' as any);

    findManySpy.mockResolvedValue([
      {
        id: 1n,
        studentId: 1n,
        componentType: 'Essay',
        status: 'COMPLETED',
        score: 10,
        createdAt: new Date(),
        student: { studentName: '홍길동' },
      },
    ]);

    countSpy.mockResolvedValue(1);

    const result = await service.findAll(1, 10);
    expect(result.items[0]).toHaveProperty('studentName', '홍길동');
  });

  describe('findOne', () => {
    it('존재하는 제출 반환', async () => {
      jest.spyOn(prisma.submission, 'findUnique' as any).mockResolvedValue({
        id: 1n,
        studentId: 1n,
        student: { studentName: '홍길동' },
      });

      const result = await service.findOne(1);
      expect(result).toHaveProperty('studentId', 1);
    });

    it('존재하지 않는 제출 → null', async () => {
      jest.spyOn(prisma.submission, 'findUnique' as any).mockResolvedValue(null);
      const result = await service.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('update & remove', () => {
    it('update 동작 확인', () => {
      const result = service.update(1, { studentName: '홍길동', submitText: 'abc' });
      expect(result).toContain('홍길동');
    });

    it('remove 동작 확인', () => {
      const result = service.remove(1);
      expect(result).toContain('1');
    });
  });
});
