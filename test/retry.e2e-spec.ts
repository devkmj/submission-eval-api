import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RetryService } from '../src/retry/retry.service';

describe('RetryService (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let retryService: RetryService;

  beforeAll(async () => {
    const producerMock = { connect: jest.fn(), send: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('KAFKA_PRODUCER')
      .useValue(producerMock)
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);
    retryService = moduleFixture.get(RetryService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('/submission (POST) → FAILED 케이스 생성 후 재시도 잡 실행', async () => {
    // 1. 학생 생성
    const studentId = BigInt(Date.now());
    await prisma.student.create({
      data: { id: studentId, studentName: 'RetryTestUser' },
    });

    // 2. 제출 생성 (FAILED 상태)
    const sub = await prisma.submission.create({
      data: {
        studentId,
        componentType: 'Essay-' + Date.now(),
        submitText: 'Hello world',
        status: 'FAILED',
      },
    });

    // 3. RetryService 수동 실행
    await retryService.retryFailed();

    // 4. DB 확인
    const updated = await prisma.submission.findUnique({ where: { id: sub.id } });
    expect(updated).not.toBeNull();
    expect(updated!.retryCount).toBeGreaterThan(0);
  });

  it('/submission (POST) → 정상 제출 시 201 + PENDING 상태', async () => {
    const studentId = Date.now();
    const res = await request(app.getHttpServer())
      .post('/v1/submissions')
      .send({
        studentId,
        studentName: '김지연',
        componentType: 'Essay',
        submitText: 'Hello world',
      })
      .expect(201);

    expect(res.body).toHaveProperty('status', 'COMPLETED');
  });
});
