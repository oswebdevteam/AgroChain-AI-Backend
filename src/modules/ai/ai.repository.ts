/**
 * ============================================
 * AgroChain AI — AI Repository
 * ============================================
 * Supabase data access for financial identities and trade statistics.
 */

import { supabaseAdmin } from '../../config/supabase';
import {
  FinancialIdentityRow,
  FinancialIdentityInsert,
  FinancialIdentityUpdate,
  TransactionHistorySummary,
  OrderStatus,
} from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('ai-repository');

export class AiRepository {
  /**
   * Get or create a financial identity for a user.
   */
  async findByUserId(userId: string): Promise<FinancialIdentityRow | null> {
    const { data, error } = await supabaseAdmin
      .from('financial_identities')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, userId }, 'Failed to fetch financial identity');
      throw AppError.internal(`Failed to fetch financial identity: ${error.message}`);
    }

    return data;
  }

  /**
   * Upsert (insert or update) a financial identity.
   */
  async upsert(data: FinancialIdentityInsert): Promise<FinancialIdentityRow> {
    const { data: identity, error } = await supabaseAdmin
      .from('financial_identities')
      .upsert(
        {
          ...data,
          last_updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to upsert financial identity');
      throw AppError.internal(`Failed to upsert financial identity: ${error.message}`);
    }

    return identity;
  }

  /**
   * Aggregate a trader's transaction history for AI analysis.
   * Computes statistics from produce_orders table.
   */
  async getTraderStats(userId: string): Promise<TransactionHistorySummary & {
    role: string;
    firstTradeDate: string | null;
  }> {
    // Get user profile for role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role ?? 'BUYER';

    // Get all orders involving this user
    const { data: allOrders, error } = await supabaseAdmin
      .from('produce_orders')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch trader orders');
      throw AppError.internal(`Failed to fetch trader stats: ${error.message}`);
    }

    const orders = allOrders ?? [];

    if (orders.length === 0) {
      return {
        role,
        total_trades: 0,
        total_volume: 0,
        avg_order_value: 0,
        on_time_delivery_rate: 0,
        dispute_rate: 0,
        cancellation_rate: 0,
        trade_frequency_per_month: 0,
        months_active: 0,
        firstTradeDate: null,
      };
    }

    const totalTrades = orders.length;
    const completedTrades = orders.filter((o) => o.status === OrderStatus.COMPLETED).length;
    const cancelledTrades = orders.filter((o) => o.status === OrderStatus.CANCELLED).length;
    const deliveredTrades = orders.filter(
      (o) => o.status === OrderStatus.DELIVERED || o.status === OrderStatus.COMPLETED
    ).length;
    const totalVolume = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const avgOrderValue = totalVolume / totalTrades;

    // Calculate tenure
    const firstTradeDate = orders[0].created_at;
    const lastTradeDate = orders[orders.length - 1].created_at;
    const tenureMs = new Date(lastTradeDate).getTime() - new Date(firstTradeDate).getTime();
    const monthsActive = Math.max(1, Math.ceil(tenureMs / (30 * 24 * 60 * 60 * 1000)));

    return {
      role,
      total_trades: totalTrades,
      total_volume: Math.round(totalVolume * 100) / 100,
      avg_order_value: Math.round(avgOrderValue * 100) / 100,
      on_time_delivery_rate: totalTrades > 0 ? deliveredTrades / totalTrades : 0,
      dispute_rate: 0, // Would track disputes separately in production
      cancellation_rate: totalTrades > 0 ? cancelledTrades / totalTrades : 0,
      trade_frequency_per_month: totalTrades / monthsActive,
      months_active: monthsActive,
      firstTradeDate,
    };
  }
}

/** Singleton instance */
export const aiRepository = new AiRepository();
