import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ComponentType } from '../../common/enums/component-type';

export class CreateSubmissionDto {
  @ApiProperty({ example: 10, description: '학생 ID' })
  @Type(() => Number)
  @IsInt()
  studentId: number;

  @ApiProperty({ example: '김지연', description: '학생 이름' })
  @IsString()
  @MinLength(1)
  studentName: string;

  @ApiProperty({
    enum: ComponentType,
    example: ComponentType.ESSAY_WRITING,
    description: '평가 컴포넌트',
  })
  @IsEnum(ComponentType)
  componentType: ComponentType;

  @ApiProperty({
    example: 'English connects people across borders in school, work, and daily life...',
    description: '에세이 본문',
  })
  @IsString()
  @MinLength(20, { message: '에세이는 최소 20자 이상이어야 합니다.' })
  submitText: string;
}
