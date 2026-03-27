import { PaginationMeta } from '../types';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SupabaseRange {
  from: number;
  to: number;
}

/**
 * Parse pagination parameters from Express query string.
 * Applies sensible defaults and enforces max limits.
 *
 * @param query - Express req.query object
 * @returns Parsed pagination parameters
 */
export function parsePaginationParams(
  query: Record<string, unknown>
): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortBy = (typeof query.sortBy === 'string' ? query.sortBy : 'created_at');
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

  return { page, limit, sortBy, sortOrder };
}

/**
 * Convert pagination params to Supabase .range() arguments.
 * Supabase .range(from, to) is 0-indexed and inclusive.
 *
 * @param params - Parsed pagination parameters
 * @returns { from, to } for Supabase range query
 */
export function toSupabaseRange(params: PaginationParams): SupabaseRange {
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  return { from, to };
}

/**
 * Build pagination metadata for API response.
 *
 * @param total - Total number of records
 * @param params - Current pagination parameters
 * @returns Pagination metadata object
 */
export function buildPaginationMeta(
  total: number,
  params: PaginationParams
): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
