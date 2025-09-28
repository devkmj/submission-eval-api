import { Controller, Get, Param, Query } from '@nestjs/common';
import { RevisionService } from './revision.service';
import { PaginatedRevisionsDto, RevisionDetailResponse } from './dto/create-revision.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

@ApiTags('Revision')
@Controller('v1/revision')
export class RevisionController {
  constructor(private readonly revisionService: RevisionService) {}

  @Get()
  @ApiOperation({
    summary: '재평가 목록 조회',
    description: '페이지네이션, 정렬을 지원하는 재평가 목록을 조회합니다.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '페이지 번호 (기본값 1)' })
  @ApiQuery({ name: 'size', required: false, type: Number, description: '페이지 크기 (기본값 20)' })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['asc', 'desc'],
    description: '정렬 순서 (기본값 desc)',
  })
  async getRevisions(
    @Query('page') page = 1,
    @Query('size') size = 20,
    @Query('sort') sort: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedRevisionsDto> {
    return this.revisionService.getRevisions(Number(page), Number(size), sort);
  }

  @Get(':revisionId')
  @ApiOperation({
    summary: '재평가 상세 조회',
    description: '특정 revisionId에 해당하는 재평가 상세 정보를 조회합니다.',
  })
  @ApiParam({ name: 'revisionId', type: String, description: '재평가 ID' })
  async getRevisionDetail(
    @Param('revisionId') revisionId: string,
  ): Promise<RevisionDetailResponse> {
    return await this.revisionService.getRevisionDetail(revisionId);
  }
}
