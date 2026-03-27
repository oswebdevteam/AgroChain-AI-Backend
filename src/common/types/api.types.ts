/**
 * ============================================
 * AgroChain AI — API Request/Response Types
 * ============================================
 * Typed interfaces for all API payloads.
 */

import { UserRole, Currency } from './enums';

// ---- Standardized API Response ----

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
}

export type ApiResponseType<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

// ---- Auth ----

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  fullName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  token: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

// ---- Orders ----

export interface CreateOrderRequest {
  sellerId: string;
  produceType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency?: Currency;
  deliveryAddress: string;
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  produceType?: string;
  startDate?: string;
  endDate?: string;
}

// ---- Payments ----

export interface InitiatePaymentRequest {
  orderId: string;
}

export interface InterswitchWebhookPayload {
  transactionRef: string;
  paymentReference: string;
  amount: number;
  responseCode: string;
  responseDescription: string;
  merchantCode: string;
}

// ---- Escrow ----

export interface ConfirmDeliveryRequest {
  deliveryProofUrl?: string;
}

// ---- Blockchain ----

export interface BlockchainProof {
  orderId: string;
  txHash: string;
  blockNumber: number;
  baseScanUrl: string;
  tradeData: {
    escrowState: string;
    deliveryConfirmed: boolean;
    timestamp: string;
  };
}

// ---- AI Financial Identity ----

export interface FinancialIdentityResponse {
  userId: string;
  creditReadinessScore: number;
  riskIndicators: Array<{
    indicator: string;
    severity: string;
    description: string;
  }>;
  reliabilityRating: number;
  financingEligibility: string;
  lastUpdated: string;
  tradeSummary: {
    totalTrades: number;
    totalVolume: number;
    avgOrderValue: number;
    onTimeDeliveryRate: number;
    disputeRate: number;
  };
}

// ---- Analytics ----

export interface TradeCorridor {
  corridor: string;
  totalVolume: number;
  tradeCount: number;
  avgSettlementTimeHours: number;
  currency: Currency;
}

export interface FxRateResponse {
  base: string;
  target: string;
  rate: number;
  lastUpdated: string;
}
