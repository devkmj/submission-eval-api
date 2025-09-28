import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from './stats.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StatsService', () => {
  let service: StatsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: PrismaService,
          useValue: {
            submission: { count: jest.fn() },
            statsDaily: { upsert: jest.fn() },
            statsWeekly: { upsert: jest.fn() },
            statsMonthly: { upsert: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(StatsService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('dailyStats는 count 후 upsert 해야 한다', async () => {
    jest.spyOn(prisma.submission, 'count').mockResolvedValueOnce(10);
    jest.spyOn(prisma.submission, 'count').mockResolvedValueOnce(7);
    jest.spyOn(prisma.submission, 'count').mockResolvedValueOnce(3);

    await service.dailyStats();

    expect(prisma.submission.count).toHaveBeenCalledTimes(3);
    expect(prisma.statsDaily.upsert).toHaveBeenCalled();
  });

  it('weeklyStats는 count 후 upsert 해야 한다', async () => {
    jest.spyOn(prisma.submission, 'count').mockResolvedValue(5);

    await service.weeklyStats();

    expect(prisma.submission.count).toHaveBeenCalledTimes(3);
    expect(prisma.statsWeekly.upsert).toHaveBeenCalled();
  });

  it('monthlyStats는 count 후 upsert 해야 한다', async () => {
    jest.spyOn(prisma.submission, 'count').mockResolvedValue(20);

    await service.monthlyStats();

    expect(prisma.submission.count).toHaveBeenCalledTimes(3);
    expect(prisma.statsMonthly.upsert).toHaveBeenCalled();
  });
});
