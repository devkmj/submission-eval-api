import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  private formatResult(result: { status: string; _count: number }[]) {
    const total = result.reduce((sum, r) => sum + r._count, 0);
    const success = result.find((r) => r.status === 'COMPLETED')?._count ?? 0;
    const failed = result.find((r) => r.status === 'FAILED')?._count ?? 0;
    return { total, success, failed };
  }

  @Cron('0 0 * * *') // 매일 자정
  async dailyStats() {
    const today = new Date();
    const from = startOfDay(today);
    const to = endOfDay(today);

    const total = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const success = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
    });
    const failed = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'FAILED' },
    });

    await this.prisma.statsDaily.upsert({
      where: { day: from },
      update: { total, success, failed },
      create: { day: from, total, success, failed },
    });
  }

  @Cron('0 0 * * 0') // 매주 일요일 자정
  async weeklyStats() {
    const now = new Date();
    const from = startOfWeek(now, { weekStartsOn: 1 });
    const to = endOfWeek(now, { weekStartsOn: 1 });

    const total = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const success = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
    });
    const failed = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'FAILED' },
    });

    await this.prisma.statsWeekly.upsert({
      where: { weekStart: from },
      update: { total, success, failed },
      create: { weekStart: from, total, success, failed },
    });
  }

  @Cron('0 0 1 * *') // 매월 1일 자정
  async monthlyStats() {
    const now = new Date();
    const from = startOfMonth(now);
    const to = endOfMonth(now);

    const total = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to } },
    });
    const success = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
    });
    const failed = await this.prisma.submission.count({
      where: { createdAt: { gte: from, lte: to }, status: 'FAILED' },
    });

    await this.prisma.statsMonthly.upsert({
      where: { monthStart: from },
      update: { total, success, failed },
      create: { monthStart: from, total, success, failed },
    });
  }
}
