/**
 * ============================================
 * AgroChain AI — Orders Routes
 * ============================================
 */

import { Router } from 'express';
import { ordersController } from './orders.controller';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';
import {
  createOrderSchema,
  orderIdParamSchema,
  confirmDeliverySchema,
  orderFiltersSchema,
} from './orders.schema';

const router = Router();

// All order routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new produce order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sellerId, produceType, quantity, unit, unitPrice, deliveryAddress]
 *             properties:
 *               sellerId: { type: string, format: uuid }
 *               produceType: { type: string }
 *               quantity: { type: number }
 *               unit: { type: string }
 *               unitPrice: { type: number }
 *               currency: { type: string, enum: [NGN, USD] }
 *               deliveryAddress: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201: { description: Order created }
 */
router.post(
  '/',
  authorize(UserRole.BUYER, UserRole.ADMIN),
  validate({ body: createOrderSchema }),
  ordersController.create.bind(ordersController)
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List orders with pagination and filters
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: produceType
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of orders }
 */
router.get(
  '/',
  validate({ query: orderFiltersSchema }),
  ordersController.list.bind(ordersController)
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Order details }
 */
router.get(
  '/:id',
  validate({ params: orderIdParamSchema }),
  ordersController.getById.bind(ordersController)
);

/**
 * @swagger
 * /orders/{id}/confirm-delivery:
 *   post:
 *     summary: Seller confirms delivery
 *     tags: [Orders]
 */
router.post(
  '/:id/confirm-delivery',
  authorize(UserRole.SELLER, UserRole.ADMIN),
  validate({ params: orderIdParamSchema, body: confirmDeliverySchema }),
  ordersController.confirmDelivery.bind(ordersController)
);

/**
 * @swagger
 * /orders/{id}/cancel:
 *   post:
 *     summary: Buyer cancels a pending order
 *     tags: [Orders]
 */
router.post(
  '/:id/cancel',
  authorize(UserRole.BUYER, UserRole.ADMIN),
  validate({ params: orderIdParamSchema }),
  ordersController.cancel.bind(ordersController)
);

export { router as ordersRoutes };
