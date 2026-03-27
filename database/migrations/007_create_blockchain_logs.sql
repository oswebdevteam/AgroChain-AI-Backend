-- ============================================
-- AgroChain AI — Migration 007: Blockchain Logs
-- ============================================

CREATE TABLE IF NOT EXISTS public.blockchain_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.produce_orders(id),
  event_type TEXT NOT NULL CHECK (
    event_type IN ('TRADE_RECORDED', 'ESCROW_RELEASED', 'DELIVERY_CONFIRMED')
  ),
  tx_hash TEXT NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bc_order_id ON public.blockchain_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_bc_tx_hash ON public.blockchain_logs(tx_hash);
CREATE INDEX IF NOT EXISTS idx_bc_event_type ON public.blockchain_logs(event_type);
