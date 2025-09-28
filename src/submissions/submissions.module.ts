import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { MediaModule } from '../media/media.module';
import { EvaluationService } from '../evaluation/evaluation.service';

@Module({
  imports: [MediaModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, EvaluationService],
})
export class SubmissionsModule {}
