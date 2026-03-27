/**
 * ============================================
 * AgroChain AI — Analytics Repository
 * ============================================
 * Supabase data access for trade corridor aggregation and analytics.
 */

import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import { OrderStatus } from '../../common/types';

const logger = createModuleLogger('analytics-repository');

export interface TradeCorridorData {
  produce_type: string;
  total_volume: number;
  trade_count: number;
  avg_settlement_hours: number;
  currency: string;
}

export interface SettlementMetrics {
  avg_settlement_hours: number;
  min_settlement_hours: number;
  max_settlement_hours: number;
  total_completed: number;
  total_volume: number;
}

export class AnalyticsRepository {
  /**
   * Aggregate trade volume by produce type (trade corridors).
   */
  async getTradeCorridor(): Promise<TradeCorridorData[]> {
    // Supabase doesn't support GROUP BY natively via the JS client, 
    // so we fetch completed orders and aggregate in-memory.
    // In production, use a Postgres function for this.
    const { data: orders, error } = await supabaseAdmin
      .from('produce_orders')
      .select('produce_type, total_amount, currency, created_at, updated_at, status')
      .eq('status', OrderStatus.COMPLETED);

    if (error) {
      logger.error({ error }, 'Failed to fetch orders for corridor analysis');
      throw AppError.internal(`Failed to fetch trade corridors: ${error.message}`);
    }

    // Aggregate by produce_type
    const corridorMap = new Map<string, {
      total_volume: number;
      trade_count: number;
      total_settlement_hours: number;
      currency: string;
    }>();

    for (const order of orders ?? []) {
      const key = order.produce_type;
      const existing = corridorMap.get(key) ?? {
        total_volume: 0,
        trade_count: 0,
        total_settlement_hours: 0,
        currency: order.currency,
      };

      // Calculate settlement time (created_at → updated_at for COMPLETED)
      const settlementHours =
        (new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) /
        (1000 * 60 * 60);

      existing.total_volume += order.total_amount;
      existing.trade_count += 1;
      existing.total_settlement_hours += settlementHours;
      corridorMap.set(key, existing);
    }

    return Array.from(corridorMap.entries()).map(([produceType, data]) => ({
      produce_type: produceType,
      total_volume: Math.round(data.total_volume * 100) / 100,
      trade_count: data.trade_count,
      avg_settlement_hours:
        data.trade_count > 0
          ? Math.round((data.total_settlement_hours / data.trade_count) * 100) / 100
          : 0,
      currency: data.currency,
    }));
  }

  /**
   * Get overall settlement metrics.
   */
  async getSettlementMetrics(): Promise<SettlementMetrics> {
    const { data: orders, error } = await supabaseAdmin
      .from('produce_orders')
      .select('total_amount, created_at, updated_at')
      .eq('status', OrderStatus.COMPLETED);

    if (error) {
      logger.error({ error }, 'Failed to fetch settlement metrics');
      throw AppError.internal(`Failed to fetch settlement metrics: ${error.message}`);
    }

    const completedOrders = orders ?? [];

    if (completedOrders.length === 0) {
      return {
        avg_settlement_hours: 0,
        min_settlement_hours: 0,
        max_settlement_hours: 0,
        total_completed: 0,
        total_volume: 0,
      };
    }

    const settlementHours = completedOrders.map((o) =>
      (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / (1000 * 60 * 60)
    );

    const totalVolume = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);

    return {
      avg_settlement_hours:
        Math.round(
          (settlementHours.reduce((a, b) => a + b, 0) / settlementHours.length) * 100
        ) / 100,
      min_settlement_hours: Math.round(Math.min(...settlementHours) * 100) / 100,
      max_settlement_hours: Math.round(Math.max(...settlementHours) * 100) / 100,
      total_completed: completedOrders.length,
      total_volume: Math.round(totalVolume * 100) / 100,
    };
  }

  /**
   * Get orders involving foreign currency for FX risk analysis.
   */
  async getCrossBorderOrders(): Promise<Array<{
    id: string;
    currency: string;
    total_amount: number;
    status: string;
  }>> {
    const { data, error } = await supabaseAdmin
      .from('produce_orders')
      .select('id, currency, total_amount, status')
      .neq('currency', 'NGN');

    if (error) {
      logger.error({ error }, 'Failed to fetch cross-border orders');
      throw AppError.internal(`Failed to fetch cross-border orders: ${error.message}`);
    }

    return data ?? [];
  }
}

/** Singleton instance */
export const analyticsRepository = new AnalyticsRepository();
