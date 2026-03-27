import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { ApiResponse } from '../../common/utils/response';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/trade-corridors
   */
  async getTradeCorridor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const corridors = await analyticsService.getTradeCorridor();
      ApiResponse.success(res, corridors);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/settlement-metrics
   */
  async getSettlementMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await analyticsService.getSettlementMetrics();
      ApiResponse.success(res, metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/fx-rate
   */
  async getFxRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const base = (req.query.base as string) ?? 'NGN';
      const target = (req.query.target as string) ?? 'USD';
      const rate = await analyticsService.getFxRate(base, target);
      ApiResponse.success(res, rate);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/cross-border-risk
   */
  async getCrossBorderRisk(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const flags = await analyticsService.getCrossBorderRiskFlags();
      ApiResponse.success(res, flags);
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const analyticsController = new AnalyticsController();
