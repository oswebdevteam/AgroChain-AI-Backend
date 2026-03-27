/**
 * ============================================
 * AgroChain AI — Blockchain Controller
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { blockchainService } from './blockchain.service';
import { ApiResponse } from '../../common/utils/response';

export class BlockchainController {
  /**
   * GET /api/v1/orders/:id/blockchain-proof
   * Get on-chain verification for a trade.
   */
  async getProof(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proof = await blockchainService.getBlockchainProof(req.params.id);
      ApiResponse.success(res, proof);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/blockchain/wallet
   * Get blockchain wallet balance (admin only).
   */
  async getWalletBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const balance = await blockchainService.getWalletBalance();
      ApiResponse.success(res, balance);
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const blockchainController = new BlockchainController();
