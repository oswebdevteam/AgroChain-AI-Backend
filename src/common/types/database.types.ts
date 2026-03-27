/**
 * ============================================
 * AgroChain AI — Database Type Definitions
 * ============================================
 * These types mirror the Supabase PostgreSQL schema.
 * In production, generate these with: npx supabase gen types typescript
 */

import {
  UserRole,
  OrderStatus,
  EscrowStatus,
  KycStatus,
  TransactionType,
  FinancingEligibility,
  BlockchainEventType,
  Currency,
} from './enums';

/** Top-level Database type for typed Supabase client */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      farmer_profiles: {
        Row: FarmerProfileRow;
        Insert: FarmerProfileInsert;
        Update: FarmerProfileUpdate;
      };
      produce_orders: {
        Row: ProduceOrderRow;
        Insert: ProduceOrderInsert;
        Update: ProduceOrderUpdate;
      };
      escrows: {
        Row: EscrowRow;
        Insert: EscrowInsert;
        Update: EscrowUpdate;
      };
      transaction_records: {
        Row: TransactionRecordRow;
        Insert: TransactionRecordInsert;
        Update: TransactionRecordUpdate;
      };
      financial_identities: {
        Row: FinancialIdentityRow;
        Insert: FinancialIdentityInsert;
        Update: FinancialIdentityUpdate;
      };
      blockchain_logs: {
        Row: BlockchainLogRow;
        Insert: BlockchainLogInsert;
        Update: BlockchainLogUpdate;
      };
    };
    Functions: {
      process_escrow_release: {
        Args: { p_order_id: string; p_payout_reference: string; p_blockchain_tx_hash: string };
        Returns: boolean;
      };
      get_trader_stats: {
        Args: { p_user_id: string };
        Returns: TraderStats;
      };
    };
  };
}

// ---- Profiles ----

export interface ProfileRow {
  id: string;
  role: UserRole;
  phone: string | null;
  email: string;
  wallet_address: string | null;
  kyc_status: KycStatus;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  role: UserRole;
  phone?: string | null;
  email: string;
  wallet_address?: string | null;
  kyc_status?: KycStatus;
  full_name?: string | null;
}

export interface ProfileUpdate {
  role?: UserRole;
  phone?: string | null;
  email?: string;
  wallet_address?: string | null;
  kyc_status?: KycStatus;
  full_name?: string | null;
  updated_at?: string;
}

// ---- Farmer Profiles ----

export interface FarmerProfileRow {
  id: string;
  user_id: string;
  farm_name: string;
  farm_location: string;
  farm_size_hectares: number | null;
  produce_types: string[];
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmerProfileInsert {
  id?: string;
  user_id: string;
  farm_name: string;
  farm_location: string;
  farm_size_hectares?: number | null;
  produce_types: string[];
  description?: string | null;
}

export interface FarmerProfileUpdate {
  farm_name?: string;
  farm_location?: string;
  farm_size_hectares?: number | null;
  produce_types?: string[];
  description?: string | null;
  updated_at?: string;
}

// ---- Produce Orders ----

export interface ProduceOrderRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  produce_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: Currency;
  status: OrderStatus;
  delivery_address: string;
  delivery_proof_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProduceOrderInsert {
  id?: string;
  buyer_id: string;
  seller_id: string;
  produce_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency?: Currency;
  status?: OrderStatus;
  delivery_address: string;
  notes?: string | null;
}

export interface ProduceOrderUpdate {
  status?: OrderStatus;
  delivery_proof_url?: string | null;
  notes?: string | null;
  updated_at?: string;
}

// ---- Escrows ----

export interface EscrowRow {
  id: string;
  order_id: string;
  amount: number;
  status: EscrowStatus;
  payment_reference: string;
  blockchain_tx_hash: string | null;
  created_at: string;
  released_at: string | null;
}

export interface EscrowInsert {
  id?: string;
  order_id: string;
  amount: number;
  status?: EscrowStatus;
  payment_reference: string;
  blockchain_tx_hash?: string | null;
}

export interface EscrowUpdate {
  status?: EscrowStatus;
  blockchain_tx_hash?: string | null;
  released_at?: string | null;
}

// ---- Transaction Records ----

export interface TransactionRecordRow {
  id: string;
  order_id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  interswitch_ref: string | null;
  blockchain_hash: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TransactionRecordInsert {
  id?: string;
  order_id: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  interswitch_ref?: string | null;
  blockchain_hash?: string | null;
  metadata?: Record<string, unknown>;
}

export interface TransactionRecordUpdate {
  interswitch_ref?: string | null;
  blockchain_hash?: string | null;
  metadata?: Record<string, unknown>;
}

// ---- Financial Identities ----

export interface RiskIndicator {
  indicator: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export interface TransactionHistorySummary {
  total_trades: number;
  total_volume: number;
  avg_order_value: number;
  on_time_delivery_rate: number;
  dispute_rate: number;
  cancellation_rate: number;
  trade_frequency_per_month: number;
  months_active: number;
}

export interface FinancialIdentityRow {
  id: string;
  user_id: string;
  credit_readiness_score: number;
  risk_indicators: RiskIndicator[];
  reliability_rating: number;
  financing_eligibility: FinancingEligibility;
  last_updated_at: string;
  transaction_history_summary: TransactionHistorySummary;
}

export interface FinancialIdentityInsert {
  id?: string;
  user_id: string;
  credit_readiness_score: number;
  risk_indicators: RiskIndicator[];
  reliability_rating: number;
  financing_eligibility: FinancingEligibility;
  transaction_history_summary: TransactionHistorySummary;
}

export interface FinancialIdentityUpdate {
  credit_readiness_score?: number;
  risk_indicators?: RiskIndicator[];
  reliability_rating?: number;
  financing_eligibility?: FinancingEligibility;
  last_updated_at?: string;
  transaction_history_summary?: TransactionHistorySummary;
}

// ---- Blockchain Logs ----

export interface BlockchainLogRow {
  id: string;
  order_id: string;
  event_type: BlockchainEventType;
  tx_hash: string;
  block_number: number;
  timestamp: string;
}

export interface BlockchainLogInsert {
  id?: string;
  order_id: string;
  event_type: BlockchainEventType;
  tx_hash: string;
  block_number: number;
  timestamp?: string;
}

export interface BlockchainLogUpdate {
  tx_hash?: string;
  block_number?: number;
}

// ---- RPC Return Types ----

export interface TraderStats {
  total_trades: number;
  total_volume: number;
  avg_order_value: number;
  completed_trades: number;
  cancelled_trades: number;
  on_time_deliveries: number;
  total_deliveries: number;
  dispute_count: number;
  first_trade_date: string | null;
  last_trade_date: string | null;
}
