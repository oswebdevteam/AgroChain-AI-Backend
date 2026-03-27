/**
 * ============================================
 * AgroChain AI — E2E Trade Flow Test
 * ============================================
 * Tests the complete trade lifecycle:
 * Register → Create Order → Pay → Escrow Hold → Confirm Delivery
 * → Release Escrow → Blockchain Record → AI Score
 *
 * All external services are mocked.
 */

import request from 'supertest';
import { app } from '../../src/app';
import { OrderStatus, EscrowStatus } from '../../src/common/types';

// Mock all external dependencies
jest.mock('../../src/common/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'e2e-buyer-id', email: 'buyer@test.com', role: 'BUYER' };
    req.accessToken = 'e2e-token';
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

const mockOrder = {
  id: 'e2e-order-id',
  buyer_id: 'e2e-buyer-id',
  seller_id: 'e2e-seller-id',
  produce_type: 'Cassava',
  quantity: 500,
  unit: 'kg',
  unit_price: 300,
  total_amount: 150000,
  currency: 'NGN',
  status: OrderStatus.PENDING,
  delivery_address: '456 Farm Lane, Abuja',
  delivery_proof_url: null,
  notes: 'E2E test order',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let currentOrderStatus = OrderStatus.PENDING;
let currentEscrowStatus: EscrowStatus | null = null;

jest.mock('../../src/modules/orders/orders.service', () => ({
  ordersService: {
    createOrder: jest.fn().mockImplementation(async () => {
      currentOrderStatus = OrderStatus.PENDING;
      return { ...mockOrder, status: currentOrderStatus };
    }),
    getOrderById: jest.fn().mockImplementation(async () => ({
      ...mockOrder,
      status: currentOrderStatus,
    })),
    listOrders: jest.fn().mockImplementation(async () => ({
      orders: [{ ...mockOrder, status: currentOrderStatus }],
      total: 1,
    })),
    confirmDelivery: jest.fn().mockImplementation(async () => {
      currentOrderStatus = OrderStatus.DELIVERED;
      return { ...mockOrder, status: currentOrderStatus };
    }),
    cancelOrder: jest.fn(),
  },
}));

jest.mock('../../src/modules/payments/payments.service', () => ({
  paymentsService: {
    initiatePayment: jest.fn().mockResolvedValue({
      transactionRef: 'AGRO-e2e-ref',
      paymentReference: 'ISW-E2E-REF',
      redirectUrl: 'https://pay.interswitch.com/e2e',
      amount: 150000,
    }),
    handleWebhook: jest.fn().mockImplementation(async () => {
      currentOrderStatus = OrderStatus.IN_ESCROW;
      currentEscrowStatus = EscrowStatus.HELD;
    }),
    verifyPayment: jest.fn().mockResolvedValue({
      status: 'COMPLETED',
      amount: 150000,
      responseCode: '00',
      responseDescription: 'Successful',
    }),
  },
}));

jest.mock('../../src/modules/escrow/escrow.service', () => ({
  escrowService: {
    getEscrowByOrderId: jest.fn().mockImplementation(async () => ({
      id: 'e2e-escrow-id',
      order_id: 'e2e-order-id',
      amount: 150000,
      status: currentEscrowStatus ?? EscrowStatus.HELD,
      payment_reference: 'ISW-E2E-REF',
      blockchain_tx_hash: null,
      created_at: new Date().toISOString(),
      released_at: null,
    })),
    releaseEscrow: jest.fn().mockImplementation(async () => {
      currentOrderStatus = OrderStatus.COMPLETED;
      currentEscrowStatus = EscrowStatus.RELEASED;
      return {
        id: 'e2e-escrow-id',
        order_id: 'e2e-order-id',
        amount: 150000,
        status: EscrowStatus.RELEASED,
        released_at: new Date().toISOString(),
      };
    }),
    createEscrow: jest.fn(),
    refundEscrow: jest.fn(),
  },
}));

jest.mock('../../src/modules/blockchain/blockchain.service', () => ({
  blockchainService: {
    getBlockchainProof: jest.fn().mockResolvedValue({
      orderId: 'e2e-order-id',
      events: [{
        eventType: 'TRADE_RECORDED',
        txHash: '0xe2e-tx-hash',
        blockNumber: 99999,
        baseScanUrl: 'https://sepolia.basescan.org/tx/0xe2e-tx-hash',
        timestamp: new Date().toISOString(),
      }],
      verified: true,
    }),
    getWalletBalance: jest.fn(),
    recordTradeOnChain: jest.fn(),
  },
}));

jest.mock('../../src/modules/ai/ai.service', () => ({
  aiService: {
    getFinancialIdentity: jest.fn().mockResolvedValue({
      user_id: 'e2e-buyer-id',
      credit_readiness_score: 65,
      risk_indicators: [],
      reliability_rating: 80,
      financing_eligibility: 'ELIGIBLE',
      last_updated_at: new Date().toISOString(),
    }),
    analyzeTraderProfile: jest.fn(),
  },
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() },
  createModuleLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
jest.mock('../../src/common/middleware/requestLogger.middleware', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

describe('E2E: Complete Trade Flow', () => {
  beforeEach(() => {
    currentOrderStatus = OrderStatus.PENDING;
    currentEscrowStatus = null;
  });

  it('should complete the full trade lifecycle', async () => {
    // Step 1: Create Order
    const createRes = await request(app)
      .post('/api/v1/orders')
      .send({
        sellerId: '00000000-0000-4000-a000-000000000099',
        produceType: 'Cassava',
        quantity: 500,
        unit: 'kg',
        unitPrice: 300,
        deliveryAddress: '456 Farm Lane, Abuja',
        notes: 'E2E test',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe(OrderStatus.PENDING);

    // Step 2: Initiate Payment
    const payRes = await request(app)
      .post('/api/v1/payments/initiate')
      .send({ orderId: 'e2e-order-id' });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.transactionRef).toBeDefined();
    expect(payRes.body.data.redirectUrl).toBeDefined();

    // Step 3: Simulate Webhook (payment confirmed → escrow created)
    const webhookRes = await request(app)
      .post('/api/v1/webhooks/interswitch')
      .set('x-interswitch-signature', 'mock-signature')
      .send({
        transactionRef: 'AGRO-e2e-ref',
        paymentReference: 'ISW-E2E-REF',
        amount: 15000000,
        responseCode: '00',
        responseDescription: 'Successful',
        merchantCode: 'MER123',
      });

    expect(webhookRes.status).toBe(200);

    // Step 4: Verify escrow exists
    const escrowRes = await request(app)
      .get('/api/v1/escrow/e2e-order-id');

    expect(escrowRes.status).toBe(200);
    expect(escrowRes.body.data.status).toBe(EscrowStatus.HELD);

    // Step 5: Confirm Delivery
    const deliveryRes = await request(app)
      .post('/api/v1/orders/00000000-0000-4000-a000-000000000001/confirm-delivery')
      .send({ deliveryProofUrl: 'https://proof.example.com/image.jpg' });

    expect(deliveryRes.status).toBe(200);

    // Step 6: Release Escrow
    const releaseRes = await request(app)
      .post('/api/v1/escrow/e2e-order-id/release');

    expect(releaseRes.status).toBe(200);
    expect(releaseRes.body.data.status).toBe(EscrowStatus.RELEASED);

    // Step 7: Get Blockchain Proof
    const proofRes = await request(app)
      .get('/api/v1/blockchain/orders/e2e-order-id/blockchain-proof');

    expect(proofRes.status).toBe(200);
    expect(proofRes.body.data.verified).toBe(true);
    expect(proofRes.body.data.events[0].baseScanUrl).toContain('basescan.org');

    // Step 8: Get Financial Identity (AI Score)
    const fiRes = await request(app)
      .get('/api/v1/users/e2e-buyer-id/financial-identity');

    expect(fiRes.status).toBe(200);
    expect(fiRes.body.data.credit_readiness_score).toBeGreaterThanOrEqual(0);
    expect(fiRes.body.data.financing_eligibility).toBeDefined();
  });
});

describe('E2E: Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
  });
});

describe('E2E: 404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
