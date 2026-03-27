/**
 * ============================================
 * AgroChain AI — Escrow Service Unit Tests
 * ============================================
 */

import { EscrowService } from '../../../src/modules/escrow/escrow.service';
import { escrowRepository } from '../../../src/modules/escrow/escrow.repository';
import { ordersRepository } from '../../../src/modules/orders/orders.repository';
import { paymentsRepository } from '../../../src/modules/payments/payments.repository';
import { createTestEscrow, createTestOrder } from '../../helpers/testData';
import { OrderStatus, EscrowStatus } from '../../../src/common/types';
import { AppError } from '../../../src/common/errors/AppError';

jest.mock('../../../src/modules/escrow/escrow.repository');
jest.mock('../../../src/modules/orders/orders.repository');
jest.mock('../../../src/modules/payments/payments.repository');
jest.mock('../../../src/modules/payments/payments.service', () => ({
  paymentsService: {
    processPayout: jest.fn().mockResolvedValue('PAYOUT-REF-001'),
  },
}));
jest.mock('../../../src/modules/blockchain/blockchain.service', () => ({
  blockchainService: {
    recordTradeOnChain: jest.fn().mockResolvedValue({
      txHash: '0xabc', blockNumber: 123, baseScanUrl: 'https://scan.url',
    }),
  },
}));
jest.mock('../../../src/modules/ai/ai.service', () => ({
  aiService: {
    analyzeTraderProfile: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('EscrowService', () => {
  let service: EscrowService;

  beforeEach(() => {
    service = new EscrowService();
    jest.clearAllMocks();
  });

  describe('createEscrow', () => {
    it('should create escrow and update order to IN_ESCROW', async () => {
      const escrow = createTestEscrow({ order_id: 'order-1', amount: 50000 });

      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(null);
      (escrowRepository.create as jest.Mock).mockResolvedValue(escrow);
      (ordersRepository.updateStatus as jest.Mock).mockResolvedValue({});
      (paymentsRepository.create as jest.Mock).mockResolvedValue({});

      const result = await service.createEscrow('order-1', 50000, 'PAY-REF');
      expect(result).toEqual(escrow);
      expect(escrowRepository.create).toHaveBeenCalledTimes(1);
      expect(ordersRepository.updateStatus).toHaveBeenCalledWith(
        'order-1',
        OrderStatus.IN_ESCROW,
        OrderStatus.PAID
      );
    });

    it('should be idempotent — return existing escrow', async () => {
      const existingEscrow = createTestEscrow({ order_id: 'order-1' });
      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(existingEscrow);

      const result = await service.createEscrow('order-1', 50000, 'PAY-REF');
      expect(result).toEqual(existingEscrow);
      expect(escrowRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('releaseEscrow', () => {
    it('should release escrow when order is DELIVERED', async () => {
      const escrow = createTestEscrow({
        id: 'esc-1',
        order_id: 'order-1',
        status: EscrowStatus.HELD,
      });
      const order = createTestOrder({
        id: 'order-1',
        status: OrderStatus.DELIVERED,
        seller_id: 'seller-1',
      });
      const releasedEscrow = { ...escrow, status: EscrowStatus.RELEASED };

      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(escrow);
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);
      (escrowRepository.updateStatus as jest.Mock).mockResolvedValue(releasedEscrow);
      (ordersRepository.updateStatus as jest.Mock).mockResolvedValue({});
      (paymentsRepository.create as jest.Mock).mockResolvedValue({});

      const result = await service.releaseEscrow('order-1');
      expect(result.status).toBe(EscrowStatus.RELEASED);
    });

    it('should throw 404 if no escrow found', async () => {
      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(null);

      await expect(service.releaseEscrow('order-1')).rejects.toThrow('not found');
    });

    it('should throw 409 if escrow is already released', async () => {
      const escrow = createTestEscrow({ status: EscrowStatus.RELEASED });
      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(escrow);

      await expect(service.releaseEscrow('order-1')).rejects.toThrow('already RELEASED');
    });

    it('should throw 409 if order is not DELIVERED', async () => {
      const escrow = createTestEscrow({ status: EscrowStatus.HELD });
      const order = createTestOrder({ status: OrderStatus.IN_ESCROW });

      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(escrow);
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(service.releaseEscrow('order-1')).rejects.toThrow('expected DELIVERED');
    });
  });

  describe('refundEscrow', () => {
    it('should refund a HELD escrow', async () => {
      const escrow = createTestEscrow({ id: 'esc-1', status: EscrowStatus.HELD });
      const refunded = { ...escrow, status: EscrowStatus.REFUNDED };

      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(escrow);
      (escrowRepository.updateStatus as jest.Mock).mockResolvedValue(refunded);
      (ordersRepository.updateStatus as jest.Mock).mockResolvedValue({});
      (paymentsRepository.create as jest.Mock).mockResolvedValue({});

      const result = await service.refundEscrow('order-1', 'Customer request');
      expect(result.status).toBe(EscrowStatus.REFUNDED);
    });

    it('should throw 409 if escrow is not HELD', async () => {
      const escrow = createTestEscrow({ status: EscrowStatus.RELEASED });
      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(escrow);

      await expect(
        service.refundEscrow('order-1', 'reason')
      ).rejects.toThrow('Cannot refund');
    });
  });
});
