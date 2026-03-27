import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /analytics/trade-corridors:
 *   get:
 *     summary: Get trade corridor analysis
 *     tags: [Analytics]
 *     description: Aggregated trade volume by produce type with settlement metrics
 *     responses:
 *       200: { description: Trade corridor data }
 */
router.get(
  '/trade-corridors',
  analyticsController.getTradeCorridor.bind(analyticsController)
);

/**
 * @swagger
 * /analytics/settlement-metrics:
 *   get:
 *     summary: Get settlement performance metrics
 *     tags: [Analytics]
 */
router.get(
  '/settlement-metrics',
  analyticsController.getSettlementMetrics.bind(analyticsController)
);

/**
 * @swagger
 * /analytics/fx-rate:
 *   get:
 *     summary: Get exchange rate between currencies
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: base
 *         schema: { type: string, default: NGN }
 *       - in: query
 *         name: target
 *         schema: { type: string, default: USD }
 */
router.get(
  '/fx-rate',
  analyticsController.getFxRate.bind(analyticsController)
);

/**
 * @swagger
 * /analytics/cross-border-risk:
 *   get:
 *     summary: Get FX risk flags for cross-border orders (admin)
 *     tags: [Analytics]
 */
router.get(
  '/cross-border-risk',
  authorize(UserRole.ADMIN),
  analyticsController.getCrossBorderRisk.bind(analyticsController)
);

export { router as analyticsRoutes };
