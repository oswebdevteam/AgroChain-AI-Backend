import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';
import { initiatePaymentSchema, interswitchWebhookSchema } from './payments.schema';

const router = Router();

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     summary: Initiate payment for an order
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Payment initiated with redirect URL }
 */
router.post(
  '/initiate',
  authenticate,
  authorize(UserRole.BUYER, UserRole.ADMIN),
  validate({ body: initiatePaymentSchema }),
  paymentsController.initiate.bind(paymentsController)
);

/**
 * @swagger
 * /payments/verify/{transactionRef}:
 *   get:
 *     summary: Verify payment status
 *     tags: [Payments]
 *     security: []
 *     description: Verify payment status after callback. No auth required - transaction reference acts as secure identifier.
 *     parameters:
 *       - in: path
 *         name: transactionRef
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Payment verification result }
 */
router.get(
  '/verify/:transactionRef',
  paymentsController.verify.bind(paymentsController)
);

export { router as paymentsRoutes };

// Webhook route is mounted separately (no auth needed)
const webhookRouter = Router();

/**
 * @swagger
 * /webhooks/interswitch:
 *   post:
 *     summary: Interswitch payment webhook
 *     tags: [Webhooks]
 *     security: []
 *     description: Called by Interswitch when payment status changes. Verified via HMAC signature.
 */
webhookRouter.post(
  '/interswitch',
  validate({ body: interswitchWebhookSchema }),
  paymentsController.handleWebhook.bind(paymentsController)
);

export { webhookRouter as webhookRoutes };
