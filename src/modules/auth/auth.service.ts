import { supabaseAdmin } from '../../config/supabase';
import { authRepository } from './auth.repository';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import { UserRole, KycStatus, ProfileRow } from '../../common/types';
import { RegisterInput, LoginInput } from './auth.schema';

const logger = createModuleLogger('auth-service');

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  /**
   * Register a new user.
   * 1. Create Supabase Auth user (email + password)
   * 2. Create profiles table row with role and extended data
   *
   * @param input - Registration data (email, password, role, optional phone/name)
   * @returns Auth result with tokens and user info
   */
  async register(input: RegisterInput): Promise<AuthResult> {
    logger.info({ email: input.email, role: input.role }, 'Registering new user');

    // Step 1: Create auth user in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true, // Auto-confirm for development
    });

    if (authError) {
      logger.error({ error: authError.message }, 'Supabase auth signup failed');
      if (authError.message.includes('already registered')) {
        throw AppError.conflict('A user with this email already exists');
      }
      throw AppError.internal(`Registration failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw AppError.internal('Registration failed: no user returned');
    }

    // Step 2: Create profile row
    try {
      await authRepository.createProfile({
        id: authData.user.id,
        email: input.email,
        role: input.role,
        phone: input.phone ?? null,
        full_name: input.fullName ?? null,
        kyc_status: KycStatus.PENDING,
      });
    } catch (profileError) {
      // Rollback: delete the auth user if profile creation fails
      logger.error({ error: profileError }, 'Profile creation failed, rolling back auth user');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Step 3: Sign in to get tokens
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError || !signInData.session) {
      logger.error({ error: signInError?.message }, 'Auto sign-in after registration failed');
      throw AppError.internal('Registration succeeded but auto sign-in failed');
    }

    logger.info({ userId: authData.user.id }, 'User registered successfully');

    return {
      user: {
        id: authData.user.id,
        email: input.email,
        role: input.role,
      },
      accessToken: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
      expiresIn: signInData.session.expires_in,
    };
  }

  /**
   * Login with email and password.
   * Returns Supabase session tokens + user profile data.
   *
   * @param input - Login credentials
   * @returns Auth result with tokens and user info
   */
  async login(input: LoginInput): Promise<AuthResult> {
    logger.info({ email: input.email }, 'User login attempt');

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user) {
      logger.warn({ email: input.email }, 'Login failed: invalid credentials');
      throw AppError.unauthorized('Invalid email or password');
    }

    // Fetch profile for role
    const profile = await authRepository.findProfileById(data.user.id);
    if (!profile) {
      throw AppError.notFound('User profile not found');
    }

    logger.info({ userId: data.user.id }, 'User logged in successfully');

    return {
      user: {
        id: data.user.id,
        email: profile.email,
        role: profile.role,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  /**
   * Request OTP via phone number.
   *
   * @param phone - Phone number to send OTP to
   */
  async requestOtp(phone: string): Promise<void> {
    logger.info({ phone }, 'OTP requested');

    const { error } = await supabaseAdmin.auth.signInWithOtp({ phone });

    if (error) {
      logger.error({ error: error.message }, 'OTP request failed');
      throw AppError.badGateway(`Failed to send OTP: ${error.message}`);
    }
  }

  /**
   * Verify OTP and complete phone authentication.
   *
   * @param phone - Phone number
   * @param token - 6-digit OTP token
   * @returns Auth result with tokens
   */
  async verifyOtp(phone: string, token: string): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.session || !data.user) {
      throw AppError.unauthorized('Invalid or expired OTP');
    }

    const profile = await authRepository.findProfileById(data.user.id);
    if (!profile) {
      throw AppError.notFound('User profile not found');
    }

    return {
      user: {
        id: data.user.id,
        email: profile.email,
        role: profile.role,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  /**
   * Refresh access token using refresh token.
   *
   * @param refreshToken - The refresh token from login/register
   * @returns New auth result with fresh tokens
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session || !data.user) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const profile = await authRepository.findProfileById(data.user.id);
    if (!profile) {
      throw AppError.notFound('User profile not found');
    }

    return {
      user: {
        id: data.user.id,
        email: profile.email,
        role: profile.role,
      },
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
    };
  }

  /**
   * Get user profile by ID.
   *
   * @param userId - User's UUID
   * @returns User profile
   */
  async getProfile(userId: string): Promise<ProfileRow> {
    const profile = await authRepository.findProfileById(userId);
    if (!profile) {
      throw AppError.notFound('User profile not found');
    }
    return profile;
  }

  /**
   * Update user profile.
   *
   * @param userId - User's UUID
   * @param data - Fields to update
   * @returns Updated profile
   */
  async updateProfile(
    userId: string,
    data: { fullName?: string; phone?: string; walletAddress?: string }
  ): Promise<ProfileRow> {
    return authRepository.updateProfile(userId, {
      full_name: data.fullName,
      phone: data.phone,
      wallet_address: data.walletAddress,
    });
  }

  /**
   * Search for seller profiles by name, email, or ID.
   *
   * @param query - Search term
   * @returns List of matching sellers
   */
  async searchSellers(query: string): Promise<ProfileRow[]> {
    return authRepository.searchSellers(query);
  }
}

/** Singleton instance */
export const authService = new AuthService();
