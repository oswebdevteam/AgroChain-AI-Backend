/**
 * ============================================
 * AgroChain AI — AI Routes
 * ============================================
 */

import { Router } from 'express';
import { aiController } from './ai.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /users/{id}/financial-identity:
 *   get:
 *     summary: Get a user's AI-generated financial identity
 *     tags: [AI Financial Identity]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Financial identity with credit score and risk indicators
 */
router.get(
  '/users/:id/financial-identity',
  aiController.getFinancialIdentity.bind(aiController)
);

/**
 * @swagger
 * /users/{id}/financial-identity/analyze:
 *   post:
 *     summary: Trigger re-analysis of financial identity (admin)
 *     tags: [AI Financial Identity]
 */
router.post(
  '/users/:id/financial-identity/analyze',
  authorize(UserRole.ADMIN),
  aiController.analyzeProfile.bind(aiController)
);

export { router as aiRoutes };
