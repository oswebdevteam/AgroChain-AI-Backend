/**
 * ============================================
 * AgroChain AI — AI Controller
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { aiService } from './ai.service';
import { ApiResponse } from '../../common/utils/response';

export class AiController {
  /**
   * GET /api/v1/users/:id/financial-identity
   * Get a user's AI-generated financial identity.
   */
  async getFinancialIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await aiService.getFinancialIdentity(req.params.id as string);
      ApiResponse.success(res, identity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/:id/financial-identity/analyze
   * Trigger a re-analysis of a user's financial identity (admin or self).
   */
  async analyzeProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const identity = await aiService.analyzeTraderProfile(req.params.id as string);
      ApiResponse.success(res, identity, 'Financial identity analysis complete');
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const aiController = new AiController();
