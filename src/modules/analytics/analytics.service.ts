/**
 * ============================================
 * AgroChain AI — Analytics Service
 * ============================================
 * Phase 4: Cross-Border Intelligence (foundational stubs).
 * Trade corridor aggregation, settlement metrics, and FX rate integration.
 */

import { config } from '../../config/env';
import { analyticsRepository } from './analytics.repository';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('analytics-service');

/** Cached FX rate */
interface CachedFxRate {
  rate: number;
  fetchedAt: number;
}

export class AnalyticsService {
  private fxCache = new Map<string, CachedFxRate>();
  private readonly FX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Get trade corridor analysis.
   * Aggregates volume by produce type, including average settlement time.
   */
  async getTradeCorridor(): Promise<Array<{
    corridor: string;
    totalVolume: number;
    tradeCount: number;
    avgSettlementTimeHours: number;
    currency: string;
  }>> {
    const corridors = await analyticsRepository.getTradeCorridor();

    return corridors.map((c) => ({
      corridor: c.produce_type,
      totalVolume: c.total_volume,
      tradeCount: c.trade_count,
      avgSettlementTimeHours: c.avg_settlement_hours,
      currency: c.currency,
    }));
  }

  /**
   * Get overall settlement performance metrics.
   */
  async getSettlementMetrics(): Promise<{
    avgSettlementHours: number;
    minSettlementHours: number;
    maxSettlementHours: number;
    totalCompletedTrades: number;
    totalVolumeNGN: number;
  }> {
    const metrics = await analyticsRepository.getSettlementMetrics();

    return {
      avgSettlementHours: metrics.avg_settlement_hours,
      minSettlementHours: metrics.min_settlement_hours,
      maxSettlementHours: metrics.max_settlement_hours,
      totalCompletedTrades: metrics.total_completed,
      totalVolumeNGN: metrics.total_volume,
    };
  }

  /**
   * Get FX rate between two currencies.
   * Uses exchangerate-api.com with 1-hour caching.
   *
   * @param baseCurrency - Base currency code (e.g., 'NGN')
   * @param targetCurrency - Target currency code (e.g., 'USD')
   * @returns Exchange rate data
   */
  async getFxRate(
    baseCurrency: string,
    targetCurrency: string
  ): Promise<{
    base: string;
    target: string;
    rate: number;
    lastUpdated: string;
  }> {
    const cacheKey = `${baseCurrency}_${targetCurrency}`;
    const cached = this.fxCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < this.FX_CACHE_TTL_MS) {
      return {
        base: baseCurrency,
        target: targetCurrency,
        rate: cached.rate,
        lastUpdated: new Date(cached.fetchedAt).toISOString(),
      };
    }

    logger.info({ baseCurrency, targetCurrency }, 'Fetching FX rate');

    try {
      const response = await fetch(
        `${config.FX_API_BASE_URL}/${config.FX_API_KEY}/pair/${baseCurrency}/${targetCurrency}`
      );

      if (!response.ok) {
        throw new Error(`FX API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        conversion_rate: number;
        time_last_update_utc: string;
      };

      this.fxCache.set(cacheKey, {
        rate: data.conversion_rate,
        fetchedAt: Date.now(),
      });

      return {
        base: baseCurrency,
        target: targetCurrency,
        rate: data.conversion_rate,
        lastUpdated: data.time_last_update_utc,
      };
    } catch (error) {
      logger.error({ error, baseCurrency, targetCurrency }, 'FX rate fetch failed');
      throw AppError.badGateway('Failed to fetch exchange rate');
    }
  }

  /**
   * Get FX risk flags for cross-border orders.
   * Flags orders involving foreign currency with current exchange rate info.
   */
  async getCrossBorderRiskFlags(): Promise<Array<{
    orderId: string;
    currency: string;
    amount: number;
    fxRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    note: string;
  }>> {
    const crossBorderOrders = await analyticsRepository.getCrossBorderOrders();

    return crossBorderOrders.map((order) => ({
      orderId: order.id,
      currency: order.currency,
      amount: order.total_amount,
      fxRiskLevel: order.currency === 'USD' ? 'MEDIUM' as const : 'HIGH' as const,
      note: `Order in ${order.currency} — subject to exchange rate fluctuations`,
    }));
  }
}

/** Singleton instance */
export const analyticsService = new AnalyticsService();
