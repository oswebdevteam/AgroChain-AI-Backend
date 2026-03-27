import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';
import type { Database } from '../common/types/database.types';

/**
 * Supabase client using the ANON key.
 * Respects Row Level Security (RLS) policies.
 * Used for client-context operations where the user's JWT is attached.
 */
export const supabaseClient: SupabaseClient<Database> = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

/**
 * Supabase admin client using the SERVICE ROLE key.
 * BYPASSES all RLS policies — use only for server-side admin operations.
 * Never expose this client to the frontend or user-facing code paths.
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Creates a per-request Supabase client scoped to a specific user's JWT.
 * This ensures RLS policies are enforced for the authenticated user.
 *
 * @param accessToken - The user's Supabase access token (JWT)
 * @returns A Supabase client with the user's auth context
 */
export function createUserClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}
