-- ============================================
-- AgroChain AI — Migration 005: Transaction Records
-- ============================================

CREATE TABLE IF NOT EXISTS public.transaction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.produce_orders(id),
  type TEXT NOT NULL CHECK (
    type IN ('PAYMENT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'REFUND', 'PAYOUT')
  ),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  interswitch_ref TEXT,
  blockchain_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_txn_order_id ON public.transaction_records(order_id);
CREATE INDEX IF NOT EXISTS idx_txn_type ON public.transaction_records(type);
CREATE INDEX IF NOT EXISTS idx_txn_interswitch_ref ON public.transaction_records(interswitch_ref);
CREATE INDEX IF NOT EXISTS idx_txn_created_at ON public.transaction_records(created_at DESC);
