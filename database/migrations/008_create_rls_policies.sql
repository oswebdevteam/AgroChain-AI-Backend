-- ============================================
-- AgroChain AI — Migration 008: RLS Policies
-- ============================================
-- Row Level Security policies enforce data ownership at the database layer.
-- Even if the API layer is compromised, users cannot access other users' data.

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Profiles Policies
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access on profiles"
  ON public.profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Farmer Profiles Policies
-- ============================================

CREATE POLICY "Users can view own farmer profile"
  ON public.farmer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own farmer profile"
  ON public.farmer_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on farmer profiles"
  ON public.farmer_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Produce Orders Policies
-- ============================================

-- Buyers can see their own orders
CREATE POLICY "Buyers can view own orders"
  ON public.produce_orders FOR SELECT
  USING (auth.uid() = buyer_id);

-- Sellers can see orders directed to them
CREATE POLICY "Sellers can view their orders"
  ON public.produce_orders FOR SELECT
  USING (auth.uid() = seller_id);

-- Buyers can create orders
CREATE POLICY "Buyers can create orders"
  ON public.produce_orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Sellers can update delivery status on their orders
CREATE POLICY "Sellers can update delivery status"
  ON public.produce_orders FOR UPDATE
  USING (auth.uid() = seller_id);

-- Admins can do everything on orders
CREATE POLICY "Admins full access on orders"
  ON public.produce_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Service role full access on orders"
  ON public.produce_orders FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Escrows Policies
-- ============================================

-- Order participants can view escrow
CREATE POLICY "Order participants can view escrow"
  ON public.escrows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.produce_orders
      WHERE produce_orders.id = escrows.order_id
        AND (produce_orders.buyer_id = auth.uid() OR produce_orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins full access on escrows"
  ON public.escrows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Service role full access on escrows"
  ON public.escrows FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Transaction Records Policies
-- ============================================

-- Order participants can view transactions
CREATE POLICY "Order participants can view transactions"
  ON public.transaction_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.produce_orders
      WHERE produce_orders.id = transaction_records.order_id
        AND (produce_orders.buyer_id = auth.uid() OR produce_orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins full access on transactions"
  ON public.transaction_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Service role full access on transactions"
  ON public.transaction_records FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Financial Identities Policies
-- ============================================

-- Users can view their own financial identity
CREATE POLICY "Users can view own financial identity"
  ON public.financial_identities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins full access on financial identities"
  ON public.financial_identities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Service role full access on financial identities"
  ON public.financial_identities FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Blockchain Logs Policies
-- ============================================

-- Order participants can view blockchain logs
CREATE POLICY "Order participants can view blockchain logs"
  ON public.blockchain_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.produce_orders
      WHERE produce_orders.id = blockchain_logs.order_id
        AND (produce_orders.buyer_id = auth.uid() OR produce_orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Admins full access on blockchain logs"
  ON public.blockchain_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Service role full access on blockchain logs"
  ON public.blockchain_logs FOR ALL
  USING (auth.role() = 'service_role');
