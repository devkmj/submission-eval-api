import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { LogsModule } from './logs/logs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { StatsModule } from './stats/stats.module';
import { RetryService } from './retry/retry.service';
import { KafkaModule } from './kafka/kafka.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { RevisionModule } from './revision/revision.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SubmissionsModule,
    AuthModule,
    LogsModule,
    ScheduleModule.forRoot(),
    StatsModule,
    KafkaModule,
    EvaluationModule,
    RevisionModule,
  ],
  controllers: [AppController],
  providers: [AppService, RequestLoggingInterceptor, RetryService],
})
export class AppModule {}
