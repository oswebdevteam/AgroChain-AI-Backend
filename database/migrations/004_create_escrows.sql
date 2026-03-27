-- ============================================
-- AgroChain AI — Migration 004: Escrows
-- ============================================

CREATE TABLE IF NOT EXISTS public.escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.produce_orders(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'RELEASED', 'REFUNDED')),
  payment_reference TEXT NOT NULL,
  blockchain_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escrows_order_id ON public.escrows(order_id);
CREATE INDEX IF NOT EXISTS idx_escrows_status ON public.escrows(status);
CREATE INDEX IF NOT EXISTS idx_escrows_payment_ref ON public.escrows(payment_reference);
