import { supabaseAdmin } from '../../config/supabase';
import { ProfileRow, ProfileInsert, ProfileUpdate, UserRole } from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('auth-repository');

export class AuthRepository {
  /**
   * Create a new user profile.
   * Called after Supabase Auth signup to store extended user data.
   *
   * @param data - Profile data to insert
   * @returns The created profile row
   */
  async createProfile(data: ProfileInsert): Promise<ProfileRow> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error({ error, userId: data.id }, 'Failed to create profile');
      throw AppError.internal(`Failed to create profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Find a user profile by ID.
   *
   * @param id - User's UUID (matches auth.users.id)
   * @returns Profile row or null if not found
   */
  async findProfileById(id: string): Promise<ProfileRow | null> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      logger.error({ error, userId: id }, 'Failed to fetch profile');
      throw AppError.internal(`Failed to fetch profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Find a user profile by email.
   *
   * @param email - User's email address
   * @returns Profile row or null if not found
   */
  async findProfileByEmail(email: string): Promise<ProfileRow | null> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error }, 'Failed to fetch profile by email');
      throw AppError.internal(`Failed to fetch profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Update a user profile.
   *
   * @param id - User's UUID
   * @param data - Fields to update
   * @returns Updated profile row
   */
  async updateProfile(id: string, data: ProfileUpdate): Promise<ProfileRow> {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, userId: id }, 'Failed to update profile');
      throw AppError.internal(`Failed to update profile: ${error.message}`);
    }

    return profile;
  }

  /**
   * Check if a user exists by ID.
   *
   * @param id - User's UUID
   * @returns true if user exists
   */
  async exists(id: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    if (error) {
      logger.error({ error, userId: id }, 'Failed to check user existence');
      throw AppError.internal(`Failed to check user: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }

  /**
   * Search for profiles with role SELLER.
   * Searches by full_name, email, or exact ID.
   *
   * @param query - Search string
   * @returns Array of matching seller profiles
   */
  async searchSellers(query: string): Promise<ProfileRow[]> {
    let builder = supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', UserRole.SELLER);

    if (query) {
      // Validate if query is a valid UUID for the id search
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isUuid = uuidRegex.test(query);

      // Use or condition for multi-field search
      if (isUuid) {
        builder = builder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,id.eq.${query}`);
      } else {
        builder = builder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
      }
    }

    const { data: profiles, error } = await builder.limit(10);

    if (error) {
      logger.error({ error, query }, 'Failed to search sellers');
      throw AppError.internal(`Failed to search sellers: ${error.message}`);
    }

    return profiles || [];
  }
}

/** Singleton instance */
export const authRepository = new AuthRepository();
