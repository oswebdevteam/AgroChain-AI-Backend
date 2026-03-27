import { Router } from 'express';
import { escrowController } from './escrow.controller';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';
import { escrowOrderIdParamSchema, refundEscrowSchema } from './escrow.schema';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /escrow/{orderId}:
 *   get:
 *     summary: Get escrow details for an order
 *     tags: [Escrow]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Escrow details }
 */
router.get(
  '/:orderId',
  validate({ params: escrowOrderIdParamSchema }),
  escrowController.getByOrderId.bind(escrowController)
);

/**
 * @swagger
 * /escrow/{orderId}/release:
 *   post:
 *     summary: Release escrow funds to seller (admin)
 *     tags: [Escrow]
 */
router.post(
  '/:orderId/release',
  authorize(UserRole.ADMIN),
  validate({ params: escrowOrderIdParamSchema }),
  escrowController.release.bind(escrowController)
);

/**
 * @swagger
 * /escrow/{orderId}/refund:
 *   post:
 *     summary: Refund escrow to buyer (admin)
 *     tags: [Escrow]
 */
router.post(
  '/:orderId/refund',
  authorize(UserRole.ADMIN),
  validate({ params: escrowOrderIdParamSchema, body: refundEscrowSchema }),
  escrowController.refund.bind(escrowController)
);

export { router as escrowRoutes };
