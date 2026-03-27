import { supabaseAdmin } from '../../config/supabase';
import {
  ProduceOrderRow,
  ProduceOrderInsert,
  ProduceOrderUpdate,
  OrderStatus,
} from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import { PaginationParams, toSupabaseRange } from '../../common/utils/pagination';

const logger = createModuleLogger('orders-repository');

export class OrdersRepository {
  /**
   * Create a new produce order.
   *
   * @param data - Order data to insert
   * @returns The created order row
   */
  async create(data: ProduceOrderInsert): Promise<ProduceOrderRow> {
    const { data: order, error } = await supabaseAdmin
      .from('produce_orders')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create order');
      throw AppError.internal(`Failed to create order: ${error.message}`);
    }

    return order;
  }

  /**
   * Find an order by ID.
   *
   * @param id - Order UUID
   * @returns Order row or null
   */
  async findById(id: string): Promise<ProduceOrderRow | null> {
    const { data: order, error } = await supabaseAdmin
      .from('produce_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, orderId: id }, 'Failed to fetch order');
      throw AppError.internal(`Failed to fetch order: ${error.message}`);
    }

    return order;
  }

  /**
   * List orders with filters and pagination.
   * Returns both the data and total count for pagination metadata.
   *
   * @param filters - Optional status, produce type, date range filters
   * @param pagination - Pagination parameters
   * @param userId - Optional user ID filter (for RLS-like behavior at app level)
   * @param userRole - User role to determine visibility
   * @returns { orders, total }
   */
  async findMany(
    filters: {
      status?: string;
      produceType?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: PaginationParams,
    userId?: string,
    userRole?: string
  ): Promise<{ orders: ProduceOrderRow[]; total: number }> {
    const range = toSupabaseRange(pagination);

    let query = supabaseAdmin
      .from('produce_orders')
      .select('*', { count: 'exact' });

    // Apply role-based filtering
    if (userRole === 'BUYER' && userId) {
      query = query.eq('buyer_id', userId);
    } else if (userRole === 'SELLER' && userId) {
      query = query.eq('seller_id', userId);
    }
    // ADMIN sees all orders — no filter

    // Apply optional filters
    if (filters.status) {
      query = query.eq('status', filters.status as OrderStatus);
    }
    if (filters.produceType) {
      query = query.ilike('produce_type', `%${filters.produceType}%`);
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // Apply sorting and pagination
    query = query
      .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
      .range(range.from, range.to);

    const { data: orders, error, count } = await query;

    if (error) {
      logger.error({ error }, 'Failed to list orders');
      throw AppError.internal(`Failed to list orders: ${error.message}`);
    }

    return { orders: orders ?? [], total: count ?? 0 };
  }

  /**
   * Update an order.
   *
   * @param id - Order UUID
   * @param data - Fields to update
   * @returns Updated order row
   */
  async update(id: string, data: ProduceOrderUpdate): Promise<ProduceOrderRow> {
    const { data: order, error } = await supabaseAdmin
      .from('produce_orders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, orderId: id }, 'Failed to update order');
      throw AppError.internal(`Failed to update order: ${error.message}`);
    }

    return order;
  }

  /**
   * Update order status atomically.
   * Validates the current status before updating to prevent invalid transitions.
   *
   * @param id - Order UUID
   * @param newStatus - Target status
   * @param currentStatus - Expected current status (optimistic lock)
   * @returns Updated order
   */
  async updateStatus(
    id: string,
    newStatus: OrderStatus,
    currentStatus: OrderStatus
  ): Promise<ProduceOrderRow> {
    const { data: order, error } = await supabaseAdmin
      .from('produce_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', currentStatus) // Optimistic concurrency check
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw AppError.conflict(
          `Cannot update order status from ${currentStatus} to ${newStatus}. Order may have been modified.`
        );
      }
      logger.error({ error, orderId: id }, 'Failed to update order status');
      throw AppError.internal(`Failed to update order status: ${error.message}`);
    }

    return order;
  }

  /**
   * Count orders by user ID and role.
   * Used for analytics and AI scoring.
   */
  async countByUser(userId: string, role: 'buyer' | 'seller'): Promise<number> {
    const column = role === 'buyer' ? 'buyer_id' : 'seller_id';
    const { count, error } = await supabaseAdmin
      .from('produce_orders')
      .select('id', { count: 'exact', head: true })
      .eq(column, userId);

    if (error) {
      logger.error({ error, userId }, 'Failed to count orders');
      throw AppError.internal(`Failed to count orders: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Get completed orders for a user (for AI analysis).
   */
  async findCompletedByUser(userId: string): Promise<ProduceOrderRow[]> {
    const { data, error } = await supabaseAdmin
      .from('produce_orders')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .eq('status', OrderStatus.COMPLETED)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch completed orders');
      throw AppError.internal(`Failed to fetch completed orders: ${error.message}`);
    }

    return data ?? [];
  }
}

/** Singleton instance */
export const ordersRepository = new OrdersRepository();
