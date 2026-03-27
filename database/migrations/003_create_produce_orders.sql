-- ============================================
-- AgroChain AI — Migration 003: Produce Orders
-- ============================================

CREATE TABLE IF NOT EXISTS public.produce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  produce_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price NUMERIC NOT NULL CHECK (unit_price > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency IN ('NGN', 'USD')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PAID', 'IN_ESCROW', 'DELIVERED', 'COMPLETED', 'CANCELLED')
  ),
  delivery_address TEXT NOT NULL,
  delivery_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Critical indexes for order queries
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.produce_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.produce_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.produce_orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.produce_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_produce_type ON public.produce_orders(produce_type);

-- Prevent self-trading
ALTER TABLE public.produce_orders
  ADD CONSTRAINT check_no_self_trade CHECK (buyer_id != seller_id);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.produce_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
