/**
 * ============================================
 * AgroChain AI — Payments Controller
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { paymentsService } from './payments.service';
import { ApiResponse } from '../../common/utils/response';

export class PaymentsController {
  /**
   * POST /api/v1/payments/initiate
   * Initiate a payment for an order via Interswitch.
   */
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.initiatePayment(
        req.body.orderId,
        req.user!.id
      );
      ApiResponse.success(res, result, 'Payment initiated');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/webhooks/interswitch
   * Handle Interswitch payment webhook.
   * NOTE: This endpoint does NOT require authentication — it uses signature verification.
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-interswitch-signature'] as string) ?? '';
      const rawBody = JSON.stringify(req.body);

      await paymentsService.handleWebhook(req.body, signature, rawBody);

      // Webhooks should always return 200 to acknowledge receipt
      ApiResponse.success(res, null, 'Webhook processed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/payments/verify/:transactionRef
   * Verify a payment status with Interswitch.
   */
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.verifyPayment(req.params.transactionRef);
      ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const paymentsController = new PaymentsController();
