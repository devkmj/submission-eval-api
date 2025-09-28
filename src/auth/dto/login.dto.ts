import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 1, description: 'Student numeric id' })
  @Type(() => Number)
  @IsInt()
  studentId: number;

  @ApiProperty({ example: '홍길동', description: 'Student name' })
  @IsString()
  studentName: string;
}
