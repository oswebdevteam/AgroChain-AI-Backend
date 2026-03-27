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
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      farmer_profiles: {
        Row: FarmerProfileRow;
        Insert: FarmerProfileInsert;
        Update: FarmerProfileUpdate;
        Relationships: [];
      };
      produce_orders: {
        Row: ProduceOrderRow;
        Insert: ProduceOrderInsert;
        Update: ProduceOrderUpdate;
        Relationships: [];
      };
      escrows: {
        Row: EscrowRow;
        Insert: EscrowInsert;
        Update: EscrowUpdate;
        Relationships: [];
      };
      transaction_records: {
        Row: TransactionRecordRow;
        Insert: TransactionRecordInsert;
        Update: TransactionRecordUpdate;
        Relationships: [];
      };
      financial_identities: {
        Row: FinancialIdentityRow;
        Insert: FinancialIdentityInsert;
        Update: FinancialIdentityUpdate;
        Relationships: [];
      };
      blockchain_logs: {
        Row: BlockchainLogRow;
        Insert: BlockchainLogInsert;
        Update: BlockchainLogUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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

export type ProfileRow = {
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

export type ProfileInsert = {
  id: string;
  role: UserRole;
  phone?: string | null;
  email: string;
  wallet_address?: string | null;
  kyc_status?: KycStatus;
  full_name?: string | null;
}

export type ProfileUpdate = {
  role?: UserRole;
  phone?: string | null;
  email?: string;
  wallet_address?: string | null;
  kyc_status?: KycStatus;
  full_name?: string | null;
  updated_at?: string;
}

// ---- Farmer Profiles ----

export type FarmerProfileRow = {
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

export type FarmerProfileInsert = {
  id?: string;
  user_id: string;
  farm_name: string;
  farm_location: string;
  farm_size_hectares?: number | null;
  produce_types: string[];
  description?: string | null;
}

export type FarmerProfileUpdate = {
  farm_name?: string;
  farm_location?: string;
  farm_size_hectares?: number | null;
  produce_types?: string[];
  description?: string | null;
  updated_at?: string;
}

// ---- Produce Orders ----

export type ProduceOrderRow = {
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

export type ProduceOrderInsert = {
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

export type ProduceOrderUpdate = {
  status?: OrderStatus;
  delivery_proof_url?: string | null;
  notes?: string | null;
  updated_at?: string;
}

// ---- Escrows ----

export type EscrowRow = {
  id: string;
  order_id: string;
  amount: number;
  status: EscrowStatus;
  payment_reference: string;
  blockchain_tx_hash: string | null;
  created_at: string;
  released_at: string | null;
}

export type EscrowInsert = {
  id?: string;
  order_id: string;
  amount: number;
  status?: EscrowStatus;
  payment_reference: string;
  blockchain_tx_hash?: string | null;
}

export type EscrowUpdate = {
  status?: EscrowStatus;
  blockchain_tx_hash?: string | null;
  released_at?: string | null;
}

// ---- Transaction Records ----

export type TransactionRecordRow = {
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

export type TransactionRecordInsert = {
  id?: string;
  order_id: string;
  type: TransactionType;
  amount: number;
  currency?: Currency;
  interswitch_ref?: string | null;
  blockchain_hash?: string | null;
  metadata?: Record<string, unknown>;
}

export type TransactionRecordUpdate = {
  interswitch_ref?: string | null;
  blockchain_hash?: string | null;
  metadata?: Record<string, unknown>;
}

// ---- Financial Identities ----

export type RiskIndicator = {
  indicator: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

export type TransactionHistorySummary = {
  total_trades: number;
  total_volume: number;
  avg_order_value: number;
  on_time_delivery_rate: number;
  dispute_rate: number;
  cancellation_rate: number;
  trade_frequency_per_month: number;
  months_active: number;
}

export type FinancialIdentityRow = {
  id: string;
  user_id: string;
  credit_readiness_score: number;
  risk_indicators: RiskIndicator[];
  reliability_rating: number;
  financing_eligibility: FinancingEligibility;
  last_updated_at: string;
  transaction_history_summary: TransactionHistorySummary;
}

export type FinancialIdentityInsert = {
  id?: string;
  user_id: string;
  credit_readiness_score: number;
  risk_indicators: RiskIndicator[];
  reliability_rating: number;
  financing_eligibility: FinancingEligibility;
  transaction_history_summary: TransactionHistorySummary;
}

export type FinancialIdentityUpdate = {
  credit_readiness_score?: number;
  risk_indicators?: RiskIndicator[];
  reliability_rating?: number;
  financing_eligibility?: FinancingEligibility;
  last_updated_at?: string;
  transaction_history_summary?: TransactionHistorySummary;
}

// ---- Blockchain Logs ----

export type BlockchainLogRow = {
  id: string;
  order_id: string;
  event_type: BlockchainEventType;
  tx_hash: string;
  block_number: number;
  timestamp: string;
}

export type BlockchainLogInsert = {
  id?: string;
  order_id: string;
  event_type: BlockchainEventType;
  tx_hash: string;
  block_number: number;
  timestamp?: string;
}

export type BlockchainLogUpdate = {
  tx_hash?: string;
  block_number?: number;
}

// ---- RPC Return Types ----

export type TraderStats = {
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
