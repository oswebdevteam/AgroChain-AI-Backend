import { Router } from 'express';
import { blockchainController } from './blockchain.controller';
import { authenticate, authorize } from '../../common/middleware/auth.middleware';
import { UserRole } from '../../common/types';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /orders/{id}/blockchain-proof:
 *   get:
 *     summary: Get blockchain verification for a trade
 *     tags: [Blockchain]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Blockchain proof with BaseScan links
 */
router.get(
  '/orders/:id/blockchain-proof',
  blockchainController.getProof.bind(blockchainController)
);

/**
 * @swagger
 * /blockchain/wallet:
 *   get:
 *     summary: Get blockchain wallet balance (admin only)
 *     tags: [Blockchain]
 */
router.get(
  '/wallet',
  authorize(UserRole.ADMIN),
  blockchainController.getWalletBalance.bind(blockchainController)
);

export { router as blockchainRoutes };
