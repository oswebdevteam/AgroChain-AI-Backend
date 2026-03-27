/**
 * ============================================
 * AgroChain AI — Test Data Factories
 * ============================================
 * Factory functions for generating typed test data.
 */

import {
  ProfileRow,
  ProduceOrderRow,
  EscrowRow,
  TransactionRecordRow,
  FinancialIdentityRow,
  BlockchainLogRow,
  UserRole,
  OrderStatus,
  EscrowStatus,
  TransactionType,
  KycStatus,
  Currency,
  FinancingEligibility,
  BlockchainEventType,
} from '../../src/common/types';

let counter = 0;
function uniqueId(): string {
  counter++;
  return `00000000-0000-4000-a000-${String(counter).padStart(12, '0')}`;
}

export function createTestProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  const id = uniqueId();
  return {
    id,
    role: UserRole.BUYER,
    phone: '+2348012345678',
    email: `user-${id.slice(-4)}@test.com`,
    wallet_address: null,
    kyc_status: KycStatus.PENDING,
    full_name: 'Test User',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestOrder(overrides: Partial<ProduceOrderRow> = {}): ProduceOrderRow {
  return {
    id: uniqueId(),
    buyer_id: uniqueId(),
    seller_id: uniqueId(),
    produce_type: 'Maize',
    quantity: 100,
    unit: 'kg',
    unit_price: 500,
    total_amount: 50000,
    currency: Currency.NGN,
    status: OrderStatus.PENDING,
    delivery_address: '123 Farm Road, Lagos',
    delivery_proof_url: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestEscrow(overrides: Partial<EscrowRow> = {}): EscrowRow {
  return {
    id: uniqueId(),
    order_id: uniqueId(),
    amount: 50000,
    status: EscrowStatus.HELD,
    payment_reference: 'PAY-REF-001',
    blockchain_tx_hash: null,
    created_at: new Date().toISOString(),
    released_at: null,
    ...overrides,
  };
}

export function createTestTransaction(
  overrides: Partial<TransactionRecordRow> = {}
): TransactionRecordRow {
  return {
    id: uniqueId(),
    order_id: uniqueId(),
    type: TransactionType.PAYMENT,
    amount: 50000,
    currency: Currency.NGN,
    interswitch_ref: 'ISW-REF-001',
    blockchain_hash: null,
    metadata: { status: 'COMPLETED' },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestFinancialIdentity(
  overrides: Partial<FinancialIdentityRow> = {}
): FinancialIdentityRow {
  return {
    id: uniqueId(),
    user_id: uniqueId(),
    credit_readiness_score: 72,
    risk_indicators: [
      { indicator: 'Limited history', severity: 'LOW', description: 'Less than 10 trades' },
    ],
    reliability_rating: 85,
    financing_eligibility: FinancingEligibility.ELIGIBLE,
    last_updated_at: new Date().toISOString(),
    transaction_history_summary: {
      total_trades: 15,
      total_volume: 750000,
      avg_order_value: 50000,
      on_time_delivery_rate: 0.93,
      dispute_rate: 0.02,
      cancellation_rate: 0.05,
      trade_frequency_per_month: 3.5,
      months_active: 4,
    },
    ...overrides,
  };
}

export function createTestBlockchainLog(
  overrides: Partial<BlockchainLogRow> = {}
): BlockchainLogRow {
  return {
    id: uniqueId(),
    order_id: uniqueId(),
    event_type: BlockchainEventType.TRADE_RECORDED,
    tx_hash: '0xabc123def456789',
    block_number: 12345678,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
