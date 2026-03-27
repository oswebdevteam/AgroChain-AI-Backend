/**
 * ============================================
 * AgroChain AI — Orders Integration Tests
 * ============================================
 * Tests the full HTTP request/response cycle for order endpoints.
 */

import request from 'supertest';
import { app } from '../../../src/app';
import { UserRole } from '../../../src/common/types';
import { createTestOrder, createTestProfile } from '../../helpers/testData';

// Mock auth middleware for integration tests
jest.mock('../../../src/common/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-buyer-id', email: 'buyer@test.com', role: 'BUYER' };
    req.accessToken = 'test-token';
    next();
  },
  authorize: (..._roles: string[]) => (req: any, _res: any, next: any) => {
    next();
  },
}));

jest.mock('../../../src/modules/orders/orders.service', () => {
  const testOrder = createTestOrder({
    id: 'order-123',
    buyer_id: 'test-buyer-id',
    seller_id: 'test-seller-id',
  });
  return {
    ordersService: {
      createOrder: jest.fn().mockResolvedValue(testOrder),
      getOrderById: jest.fn().mockResolvedValue(testOrder),
      listOrders: jest.fn().mockResolvedValue({ orders: [testOrder], total: 1 }),
      confirmDelivery: jest.fn().mockResolvedValue({ ...testOrder, status: 'DELIVERED' }),
      cancelOrder: jest.fn().mockResolvedValue({ ...testOrder, status: 'CANCELLED' }),
    },
  };
});

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() },
  createModuleLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
jest.mock('../../../src/common/middleware/requestLogger.middleware', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

describe('Orders API', () => {
  describe('POST /api/v1/orders', () => {
    it('should create an order with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          sellerId: '00000000-0000-4000-a000-000000000001',
          produceType: 'Maize',
          quantity: 100,
          unit: 'kg',
          unitPrice: 500,
          deliveryAddress: '123 Farm Road, Lagos',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 400 for invalid request body', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          // Missing required fields
          produceType: 'Maize',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for negative quantity', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .send({
          sellerId: '00000000-0000-4000-a000-000000000001',
          produceType: 'Maize',
          quantity: -10,
          unit: 'kg',
          unitPrice: 500,
          deliveryAddress: '123 Farm Road',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should return paginated orders list', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .query({ page: '1', limit: '20' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should return order by ID', async () => {
      const res = await request(app)
        .get('/api/v1/orders/00000000-0000-4000-a000-000000000001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/orders/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/orders/:id/confirm-delivery', () => {
    it('should confirm delivery', async () => {
      const res = await request(app)
        .post('/api/v1/orders/00000000-0000-4000-a000-000000000001/confirm-delivery')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    it('should cancel order', async () => {
      const res = await request(app)
        .post('/api/v1/orders/00000000-0000-4000-a000-000000000001/cancel');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
