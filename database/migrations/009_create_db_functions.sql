-- ============================================
-- AgroChain AI — Migration 009: Database Functions
-- ============================================
-- Postgres functions for atomic operations that need transaction guarantees.

-- ============================================
-- process_escrow_release: Atomic escrow release
-- ============================================
-- Updates escrow, order, and creates transaction record in a single transaction.
-- Prevents partial state if any step fails.

CREATE OR REPLACE FUNCTION process_escrow_release(
  p_order_id UUID,
  p_payout_reference TEXT,
  p_blockchain_tx_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_escrow_id UUID;
  v_escrow_amount NUMERIC;
  v_seller_id UUID;
BEGIN
  -- Step 1: Get and lock the escrow record
  SELECT id, amount INTO v_escrow_id, v_escrow_amount
  FROM public.escrows
  WHERE order_id = p_order_id AND status = 'HELD'
  FOR UPDATE;

  IF v_escrow_id IS NULL THEN
    RAISE EXCEPTION 'No HELD escrow found for order %', p_order_id;
  END IF;

  -- Step 2: Get seller ID
  SELECT seller_id INTO v_seller_id
  FROM public.produce_orders
  WHERE id = p_order_id;

  -- Step 3: Update escrow to RELEASED
  UPDATE public.escrows
  SET
    status = 'RELEASED',
    released_at = NOW(),
    blockchain_tx_hash = COALESCE(p_blockchain_tx_hash, blockchain_tx_hash)
  WHERE id = v_escrow_id;

  -- Step 4: Update order to COMPLETED
  UPDATE public.produce_orders
  SET
    status = 'COMPLETED',
    updated_at = NOW()
  WHERE id = p_order_id AND status = 'DELIVERED';

  -- Step 5: Create ESCROW_RELEASE transaction record
  INSERT INTO public.transaction_records (
    order_id, type, amount, currency, interswitch_ref, blockchain_hash, metadata
  ) VALUES (
    p_order_id,
    'ESCROW_RELEASE',
    v_escrow_amount,
    'NGN',
    p_payout_reference,
    p_blockchain_tx_hash,
    jsonb_build_object(
      'escrowId', v_escrow_id,
      'sellerId', v_seller_id,
      'status', 'RELEASED',
      'releasedAt', NOW()::TEXT,
      'processedVia', 'db_function'
    )
  );

  RETURN TRUE;
END;
$$;

-- ============================================
-- get_trader_stats: Aggregate trading statistics
-- ============================================
-- Returns comprehensive trading statistics for AI analysis.

CREATE OR REPLACE FUNCTION get_trader_stats(p_user_id UUID)
RETURNS TABLE (
  total_trades BIGINT,
  total_volume NUMERIC,
  avg_order_value NUMERIC,
  completed_trades BIGINT,
  cancelled_trades BIGINT,
  on_time_deliveries BIGINT,
  total_deliveries BIGINT,
  dispute_count BIGINT,
  first_trade_date TIMESTAMPTZ,
  last_trade_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_trades,
    COALESCE(SUM(po.total_amount), 0)::NUMERIC AS total_volume,
    COALESCE(AVG(po.total_amount), 0)::NUMERIC AS avg_order_value,
    COUNT(*) FILTER (WHERE po.status = 'COMPLETED')::BIGINT AS completed_trades,
    COUNT(*) FILTER (WHERE po.status = 'CANCELLED')::BIGINT AS cancelled_trades,
    COUNT(*) FILTER (WHERE po.status IN ('DELIVERED', 'COMPLETED'))::BIGINT AS on_time_deliveries,
    COUNT(*) FILTER (WHERE po.status IN ('DELIVERED', 'COMPLETED', 'IN_ESCROW'))::BIGINT AS total_deliveries,
    0::BIGINT AS dispute_count, -- Would track disputes separately
    MIN(po.created_at) AS first_trade_date,
    MAX(po.created_at) AS last_trade_date
  FROM public.produce_orders po
  WHERE po.buyer_id = p_user_id OR po.seller_id = p_user_id;
END;
$$;
