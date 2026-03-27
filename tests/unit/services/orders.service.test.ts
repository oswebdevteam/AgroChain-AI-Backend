/**
 * ============================================
 * AgroChain AI — Orders Service Unit Tests
 * ============================================
 */

import { OrdersService } from '../../../src/modules/orders/orders.service';
import { ordersRepository } from '../../../src/modules/orders/orders.repository';
import { authRepository } from '../../../src/modules/auth/auth.repository';
import { createTestProfile, createTestOrder } from '../../helpers/testData';
import { OrderStatus, UserRole } from '../../../src/common/types';
import { AppError } from '../../../src/common/errors/AppError';

// Mock dependencies
jest.mock('../../../src/modules/orders/orders.repository');
jest.mock('../../../src/modules/auth/auth.repository');
jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    service = new OrdersService();
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create an order successfully', async () => {
      const buyer = createTestProfile({ id: 'buyer-1', role: UserRole.BUYER });
      const seller = createTestProfile({ id: 'seller-1', role: UserRole.SELLER });
      const expectedOrder = createTestOrder({
        buyer_id: 'buyer-1',
        seller_id: 'seller-1',
        total_amount: 50000,
      });

      (authRepository.findProfileById as jest.Mock).mockResolvedValue(seller);
      (ordersRepository.create as jest.Mock).mockResolvedValue(expectedOrder);

      const result = await service.createOrder(buyer.id, {
        sellerId: seller.id,
        produceType: 'Maize',
        quantity: 100,
        unit: 'kg',
        unitPrice: 500,
        deliveryAddress: '123 Farm Road',
      });

      expect(result).toEqual(expectedOrder);
      expect(ordersRepository.create).toHaveBeenCalledTimes(1);
      // Verify total_amount = quantity * unitPrice
      const createCall = (ordersRepository.create as jest.Mock).mock.calls[0][0];
      expect(createCall.total_amount).toBe(50000);
    });

    it('should throw 404 if seller not found', async () => {
      (authRepository.findProfileById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createOrder('buyer-1', {
          sellerId: 'nonexistent',
          produceType: 'Maize',
          quantity: 100,
          unit: 'kg',
          unitPrice: 500,
          deliveryAddress: '123 Farm Road',
        })
      ).rejects.toThrow(AppError);
    });

    it('should throw 400 if target user is not a seller', async () => {
      const notASeller = createTestProfile({ id: 'user-1', role: UserRole.BUYER });
      (authRepository.findProfileById as jest.Mock).mockResolvedValue(notASeller);

      await expect(
        service.createOrder('buyer-1', {
          sellerId: notASeller.id,
          produceType: 'Maize',
          quantity: 100,
          unit: 'kg',
          unitPrice: 500,
          deliveryAddress: '123 Farm Road',
        })
      ).rejects.toThrow('not a registered seller');
    });

    it('should throw 400 for self-trading', async () => {
      const seller = createTestProfile({ id: 'user-1', role: UserRole.SELLER });
      (authRepository.findProfileById as jest.Mock).mockResolvedValue(seller);

      await expect(
        service.createOrder('user-1', {
          sellerId: 'user-1',
          produceType: 'Maize',
          quantity: 100,
          unit: 'kg',
          unitPrice: 500,
          deliveryAddress: '123 Farm Road',
        })
      ).rejects.toThrow('yourself');
    });

    it('should correctly round total_amount for financial precision', async () => {
      const seller = createTestProfile({ id: 'seller-1', role: UserRole.SELLER });
      (authRepository.findProfileById as jest.Mock).mockResolvedValue(seller);
      (ordersRepository.create as jest.Mock).mockImplementation(async (data) => ({
        ...createTestOrder(),
        ...data,
      }));

      await service.createOrder('buyer-1', {
        sellerId: 'seller-1',
        produceType: 'Rice',
        quantity: 3,
        unit: 'kg',
        unitPrice: 33.33,
        deliveryAddress: 'Address',
      });

      const createCall = (ordersRepository.create as jest.Mock).mock.calls[0][0];
      expect(createCall.total_amount).toBe(99.99);
    });
  });

  describe('getOrderById', () => {
    it('should return order for buyer', async () => {
      const order = createTestOrder({ buyer_id: 'user-1' });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrderById(order.id, 'user-1', UserRole.BUYER);
      expect(result).toEqual(order);
    });

    it('should return order for seller', async () => {
      const order = createTestOrder({ seller_id: 'user-1' });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrderById(order.id, 'user-1', UserRole.SELLER);
      expect(result).toEqual(order);
    });

    it('should allow admin to see any order', async () => {
      const order = createTestOrder({ buyer_id: 'other-1', seller_id: 'other-2' });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      const result = await service.getOrderById(order.id, 'admin-1', UserRole.ADMIN);
      expect(result).toEqual(order);
    });

    it('should throw 403 if user is not order participant', async () => {
      const order = createTestOrder({ buyer_id: 'other-1', seller_id: 'other-2' });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(
        service.getOrderById(order.id, 'unrelated-user', UserRole.BUYER)
      ).rejects.toThrow('do not have access');
    });

    it('should throw 404 if order not found', async () => {
      (ordersRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getOrderById('nonexistent', 'user-1', UserRole.BUYER)
      ).rejects.toThrow('not found');
    });
  });

  describe('confirmDelivery', () => {
    it('should confirm delivery for seller when order is IN_ESCROW', async () => {
      const order = createTestOrder({
        id: 'order-1',
        seller_id: 'seller-1',
        status: OrderStatus.IN_ESCROW,
      });
      const updatedOrder = { ...order, status: OrderStatus.DELIVERED };

      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);
      (ordersRepository.update as jest.Mock).mockResolvedValue(updatedOrder);

      const result = await service.confirmDelivery('order-1', 'seller-1', 'https://proof.jpg');
      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('should throw 403 if non-seller tries to confirm', async () => {
      const order = createTestOrder({ seller_id: 'seller-1', status: OrderStatus.IN_ESCROW });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(
        service.confirmDelivery(order.id, 'not-the-seller')
      ).rejects.toThrow('Only the seller');
    });

    it('should throw 409 if order is not IN_ESCROW', async () => {
      const order = createTestOrder({ seller_id: 'seller-1', status: OrderStatus.PENDING });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(
        service.confirmDelivery(order.id, 'seller-1')
      ).rejects.toThrow('expected IN_ESCROW');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel a PENDING order by the buyer', async () => {
      const order = createTestOrder({ buyer_id: 'buyer-1', status: OrderStatus.PENDING });
      const cancelled = { ...order, status: OrderStatus.CANCELLED };

      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);
      (ordersRepository.updateStatus as jest.Mock).mockResolvedValue(cancelled);

      const result = await service.cancelOrder(order.id, 'buyer-1');
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw 403 if non-buyer tries to cancel', async () => {
      const order = createTestOrder({ buyer_id: 'buyer-1' });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(service.cancelOrder(order.id, 'not-buyer')).rejects.toThrow('Only the buyer');
    });

    it('should throw 409 if order is not PENDING', async () => {
      const order = createTestOrder({ buyer_id: 'buyer-1', status: OrderStatus.IN_ESCROW });
      (ordersRepository.findById as jest.Mock).mockResolvedValue(order);

      await expect(service.cancelOrder(order.id, 'buyer-1')).rejects.toThrow('only PENDING');
    });
  });
});
