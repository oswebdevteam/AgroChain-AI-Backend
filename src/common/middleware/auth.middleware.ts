/**
 * ============================================
 * AgroChain AI — Authentication Middleware
 * ============================================
 * JWT verification using Supabase Auth.
 * Attaches typed user object to request for downstream handlers.
 */

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../config/supabase';
import { AppError } from '../errors/AppError';
import { UserRole, AuthenticatedUser } from '../types';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('auth-middleware');

/**
 * Extend Express Request to include authenticated user.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      accessToken?: string;
    }
  }
}

/**
 * Middleware: Verify Supabase JWT and attach user to request.
 * Extracts token from Authorization header (Bearer scheme).
 * Fetches user profile to determine role.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7);

    // Verify the JWT with Supabase
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      logger.warn({ error: error?.message }, 'JWT verification failed');
      throw AppError.unauthorized('Invalid or expired token');
    }

    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      logger.warn({ userId: data.user.id }, 'User profile not found');
      throw AppError.unauthorized('User profile not found');
    }

    // Attach authenticated user to request
    req.user = {
      id: data.user.id,
      email: profile.email,
      role: profile.role as UserRole,
    };
    req.accessToken = token;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory: Restrict access to specific roles.
 * Must be used AFTER authenticate middleware.
 *
 * @param allowedRoles - Roles permitted to access the endpoint
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        { userId: req.user.id, role: req.user.role, required: allowedRoles },
        'Authorization failed: insufficient role'
      );
      return next(
        AppError.forbidden(
          `Role '${req.user.role}' does not have access. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
