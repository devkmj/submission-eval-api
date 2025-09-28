import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StatsService } from './stats.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 스케줄러 활성화
  ],
  providers: [PrismaService, StatsService],
})
export class StatsModule {}
