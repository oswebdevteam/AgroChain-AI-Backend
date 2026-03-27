-- ============================================
-- AgroChain AI — Migration 002: Farmer Profiles
-- ============================================

CREATE TABLE IF NOT EXISTS public.farmer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  farm_location TEXT NOT NULL,
  farm_size_hectares NUMERIC,
  produce_types TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_profiles_user_id ON public.farmer_profiles(user_id);

CREATE TRIGGER farmer_profiles_updated_at
  BEFORE UPDATE ON public.farmer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
