-- ============================================
-- AgroChain AI — Migration 006: Financial Identities
-- ============================================

CREATE TABLE IF NOT EXISTS public.financial_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  credit_readiness_score INTEGER NOT NULL CHECK (credit_readiness_score BETWEEN 0 AND 100),
  risk_indicators JSONB NOT NULL DEFAULT '[]',
  reliability_rating INTEGER NOT NULL CHECK (reliability_rating BETWEEN 0 AND 100),
  financing_eligibility TEXT NOT NULL CHECK (
    financing_eligibility IN ('ELIGIBLE', 'NEEDS_MORE_DATA', 'HIGH_RISK')
  ),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_history_summary JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_fi_user_id ON public.financial_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_fi_score ON public.financial_identities(credit_readiness_score DESC);
CREATE INDEX IF NOT EXISTS idx_fi_eligibility ON public.financial_identities(financing_eligibility);
