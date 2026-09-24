import { sanitizeIlike } from './validation';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export type PaginationQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export type PagedRange = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
  search: string;
};

export function toPagedRange(query: PaginationQuery): PagedRange {
  const page = Math.max(0, Math.floor(query.page ?? 0));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(query.pageSize ?? DEFAULT_PAGE_SIZE)));
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const search = query.search ? sanitizeIlike(query.search) : '';
  return { page, pageSize, from, to, search };
}

export type PagedResult<T> = {
  data: T[];
  count: number | null;
  hasMore: boolean;
  page: number;
  pageSize: number;
};
