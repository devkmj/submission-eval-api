import { Revision } from '@prisma/client';

export interface RevisionDetailResponse {
  result: 'ok' | 'failed';
  message?: string | null;
  revision?: Revision | null;
}

export interface PaginatedRevisionsDto {
  result: 'ok' | 'failed';
  page: number;
  size: number;
  total: number;
  items: Revision[];
}
