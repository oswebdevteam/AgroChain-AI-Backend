/** User roles for role-based access control */
export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

/** Order lifecycle status */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  IN_ESCROW = 'IN_ESCROW',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Escrow lifecycle status */
export enum EscrowStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
}

/** KYC verification status */
export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

/** Types of financial transactions recorded */
export enum TransactionType {
  PAYMENT = 'PAYMENT',
  ESCROW_HOLD = 'ESCROW_HOLD',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
}

/** AI-determined financing eligibility signal */
export enum FinancingEligibility {
  ELIGIBLE = 'ELIGIBLE',
  NEEDS_MORE_DATA = 'NEEDS_MORE_DATA',
  HIGH_RISK = 'HIGH_RISK',
}

/** Blockchain event types for logging */
export enum BlockchainEventType {
  TRADE_RECORDED = 'TRADE_RECORDED',
  ESCROW_RELEASED = 'ESCROW_RELEASED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
}

/** Supported currencies */
export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}
