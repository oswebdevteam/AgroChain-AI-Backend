import { escrowRepository } from './escrow.repository';
import { ordersRepository } from '../orders/orders.repository';
import { paymentsRepository } from '../payments/payments.repository';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import {
  EscrowStatus,
  OrderStatus,
  TransactionType,
  Currency,
  EscrowRow,
} from '../../common/types';
import { generateUUID } from '../../common/utils/crypto';

const logger = createModuleLogger('escrow-service');

export class EscrowService {
  /**
   * Create an escrow hold after successful payment.
   *
   * Atomic sequence:
   * 1. Create escrow record with status HELD
   * 2. Update order status from PAID → IN_ESCROW
   * 3. Create ESCROW_HOLD transaction record
   *
   * If any step fails, the operation should be retried or manually reconciled.
   * Each step is idempotent by design.
   *
   * @param orderId - Order that was paid for
   * @param amount - Amount held in escrow
   * @param paymentReference - Interswitch payment reference
   * @returns Created escrow record
   */
  async createEscrow(
    orderId: string,
    amount: number,
    paymentReference: string
  ): Promise<EscrowRow> {
    logger.info({ orderId, amount, paymentReference }, 'Creating escrow hold');

    // Idempotency: check if escrow already exists for this order
    const existingEscrow = await escrowRepository.findByOrderId(orderId);
    if (existingEscrow) {
      logger.info({ orderId }, 'Escrow already exists — returning existing');
      return existingEscrow;
    }

    // Step 1: Create escrow record
    const escrow = await escrowRepository.create({
      id: generateUUID(),
      order_id: orderId,
      amount,
      status: EscrowStatus.HELD,
      payment_reference: paymentReference,
    });

    // Step 2: Update order status to IN_ESCROW
    try {
      await ordersRepository.updateStatus(orderId, OrderStatus.IN_ESCROW, OrderStatus.PAID);
    } catch (error) {
      logger.error({ error, orderId }, 'Failed to update order to IN_ESCROW after escrow creation');
      // Escrow was created but order status failed — needs manual reconciliation
      // In production: use a Postgres function for true atomicity
      throw error;
    }

    // Step 3: Record the escrow hold transaction
    await paymentsRepository.create({
      id: generateUUID(),
      order_id: orderId,
      type: TransactionType.ESCROW_HOLD,
      amount,
      currency: Currency.NGN,
      interswitch_ref: paymentReference,
      metadata: {
        escrowId: escrow.id,
        status: 'HELD',
        heldAt: new Date().toISOString(),
      },
    });

    logger.info({ escrowId: escrow.id, orderId }, 'Escrow created successfully');
    return escrow;
  }

  /**
   * Release escrow funds to the seller.
   *
   * Triggered after delivery is confirmed by the seller.
   * Full release sequence:
   * 1. Validate escrow is HELD and order is DELIVERED
   * 2. Process payout to seller (via payments service)
   * 3. Update escrow to RELEASED
   * 4. Update order to COMPLETED
   * 5. Record ESCROW_RELEASE transaction
   * 6. Trigger blockchain recording (Phase 2)
   * 7. Trigger AI analysis (Phase 3)
   *
   * Steps 6 and 7 are async and non-blocking (fire and forget with error logging).
   *
   * @param orderId - Order whose escrow to release
   * @returns Released escrow record
   */
  async releaseEscrow(orderId: string): Promise<EscrowRow> {
    logger.info({ orderId }, 'Releasing escrow');

    // Step 1: Validate
    const escrow = await escrowRepository.findByOrderId(orderId);
    if (!escrow) {
      throw AppError.notFound('Escrow not found for this order');
    }
    if (escrow.status !== EscrowStatus.HELD) {
      throw AppError.conflict(`Escrow is already ${escrow.status}`);
    }

    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw AppError.conflict(
        `Cannot release escrow: order status is ${order.status}, expected DELIVERED`
      );
    }

    // Step 2: Process payout to seller
    // Import dynamically to avoid circular dependency
    const { paymentsService } = await import('../payments/payments.service');
    const payoutRef = await paymentsService.processPayout(
      order.seller_id,
      escrow.amount,
      orderId
    );

    // Step 3: Update escrow to RELEASED
    const releasedEscrow = await escrowRepository.updateStatus(
      escrow.id,
      EscrowStatus.RELEASED,
      EscrowStatus.HELD
    );

    // Step 4: Update order to COMPLETED
    await ordersRepository.updateStatus(orderId, OrderStatus.COMPLETED, OrderStatus.DELIVERED);

    // Step 5: Record escrow release transaction
    await paymentsRepository.create({
      id: generateUUID(),
      order_id: orderId,
      type: TransactionType.ESCROW_RELEASE,
      amount: escrow.amount,
      currency: Currency.NGN,
      interswitch_ref: payoutRef,
      metadata: {
        escrowId: escrow.id,
        sellerId: order.seller_id,
        status: 'RELEASED',
        releasedAt: new Date().toISOString(),
      },
    });

    // Step 6: Trigger blockchain recording (async, non-blocking)
    this.triggerBlockchainRecording(orderId, releasedEscrow).catch((err) => {
      logger.error({ error: err, orderId }, 'Async blockchain recording failed');
    });

    // Step 7: Trigger AI analysis (async, non-blocking)
    this.triggerAiAnalysis(order.buyer_id, order.seller_id).catch((err) => {
      logger.error({ error: err, orderId }, 'Async AI analysis failed');
    });

    logger.info({ escrowId: escrow.id, orderId, payoutRef }, 'Escrow released successfully');
    return releasedEscrow;
  }

  /**
   * Refund escrowed funds to the buyer.
   *
   * @param orderId - Order whose escrow to refund
   * @param reason - Reason for refund
   * @returns Refunded escrow record
   */
  async refundEscrow(orderId: string, reason: string): Promise<EscrowRow> {
    logger.info({ orderId, reason }, 'Refunding escrow');

    const escrow = await escrowRepository.findByOrderId(orderId);
    if (!escrow) {
      throw AppError.notFound('Escrow not found for this order');
    }
    if (escrow.status !== EscrowStatus.HELD) {
      throw AppError.conflict(`Cannot refund: escrow is ${escrow.status}`);
    }

    // Update escrow to REFUNDED
    const refundedEscrow = await escrowRepository.updateStatus(
      escrow.id,
      EscrowStatus.REFUNDED,
      EscrowStatus.HELD
    );

    // Update order to CANCELLED
    await ordersRepository.updateStatus(orderId, OrderStatus.CANCELLED, OrderStatus.IN_ESCROW);

    // Record refund transaction
    await paymentsRepository.create({
      id: generateUUID(),
      order_id: orderId,
      type: TransactionType.REFUND,
      amount: escrow.amount,
      currency: Currency.NGN,
      metadata: {
        escrowId: escrow.id,
        reason,
        status: 'REFUNDED',
        refundedAt: new Date().toISOString(),
      },
    });

    logger.info({ escrowId: escrow.id, orderId }, 'Escrow refunded');
    return refundedEscrow;
  }

  /**
   * Get escrow details for an order.
   */
  async getEscrowByOrderId(orderId: string): Promise<EscrowRow> {
    const escrow = await escrowRepository.findByOrderId(orderId);
    if (!escrow) {
      throw AppError.notFound('Escrow not found for this order');
    }
    return escrow;
  }

  /**
   * Async trigger for blockchain recording (Phase 2).
   * Non-blocking — failures are logged but don't affect escrow release.
   */
  private async triggerBlockchainRecording(
    orderId: string,
    escrow: EscrowRow
  ): Promise<void> {
    try {
      const { blockchainService } = await import('../blockchain/blockchain.service');
      await blockchainService.recordTradeOnChain(orderId, {
        escrowState: escrow.status,
        amount: escrow.amount,
        paymentReference: escrow.payment_reference,
      });
    } catch (error) {
      logger.error({ error, orderId }, 'Blockchain recording failed (non-critical)');
    }
  }

  /**
   * Async trigger for AI financial identity analysis (Phase 3).
   * Analyzes both buyer and seller profiles.
   */
  private async triggerAiAnalysis(buyerId: string, sellerId: string): Promise<void> {
    try {
      const { aiService } = await import('../ai/ai.service');
      await Promise.allSettled([
        aiService.analyzeTraderProfile(buyerId),
        aiService.analyzeTraderProfile(sellerId),
      ]);
    } catch (error) {
      logger.error({ error }, 'AI analysis trigger failed (non-critical)');
    }
  }
}

/** Singleton instance */
export const escrowService = new EscrowService();
