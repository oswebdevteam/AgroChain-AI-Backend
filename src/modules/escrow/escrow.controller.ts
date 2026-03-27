import { Request, Response, NextFunction } from 'express';
import { escrowService } from './escrow.service';
import { ApiResponse } from '../../common/utils/response';

export class EscrowController {
  /**
   * GET /api/v1/escrow/:orderId
   * Get escrow details for an order.
   */
  async getByOrderId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const escrow = await escrowService.getEscrowByOrderId(req.params.orderId as string);
      ApiResponse.success(res, escrow);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/escrow/:orderId/release
   * Admin-triggered escrow release (normally auto-triggered on delivery confirmation).
   */
  async release(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const escrow = await escrowService.releaseEscrow(req.params.orderId as string);
      ApiResponse.success(res, escrow, 'Escrow released successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/escrow/:orderId/refund
   * Admin-triggered escrow refund.
   */
  async refund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reason = req.body.reason ?? 'Admin-initiated refund';
      const escrow = await escrowService.refundEscrow(req.params.orderId as string, reason);
      ApiResponse.success(res, escrow, 'Escrow refunded successfully');
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const escrowController = new EscrowController();
