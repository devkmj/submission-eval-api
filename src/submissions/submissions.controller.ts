import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Submissions')
@Controller('v1/submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiOperation({
    summary: '제출 목록 조회',
    description: '페이지네이션을 지원하는 제출 목록을 조회합니다.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: '페이지 번호 (기본값 1)',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    example: 20,
    description: '페이지 크기 (기본값 20)',
  })
  findAll(@Query('page') page?: string, @Query('size') size?: string) {
    const p = Number(page) || 1;
    const s = Number(size) || 20;
    return this.submissionsService.findAll(p, s);
  }

  @Get(':id')
  @ApiOperation({
    summary: '제출 상세 조회',
    description: '특정 제출 ID로 제출 상세를 조회합니다.',
  })
  @ApiParam({ name: 'id', type: Number, description: '제출 ID' })
  findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({
    summary: '제출 생성',
    description: '학생의 제출 텍스트와 동영상 파일을 업로드합니다.',
  })
  @UseInterceptors(FileInterceptor('videoFile'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        studentId: { type: 'integer', example: 3 },
        studentName: { type: 'string', example: '김지연' },
        componentType: { type: 'string', example: 'Essay Writing' },
        submitText: { type: 'string', example: 'Hello...' },
        videoFile: { type: 'string', format: 'binary' },
      },
      required: ['studentId', 'studentName', 'componentType', 'submitText'],
    },
  })
  async create(@Body() dto: CreateSubmissionDto, @UploadedFile() videoFile?: Express.Multer.File) {
    return this.submissionsService.create(dto, videoFile);
  }
}
