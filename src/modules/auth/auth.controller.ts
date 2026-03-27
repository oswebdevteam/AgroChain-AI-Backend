import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { ApiResponse } from '../../common/utils/response';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user with email, password, and role.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      ApiResponse.created(res, {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Authenticate with email and password.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/otp/request
   * Request OTP via phone number.
   */
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.requestOtp(req.body.phone);
      ApiResponse.success(res, null, 'OTP sent successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/otp/verify
   * Verify OTP and authenticate.
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body.phone, req.body.token);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }, 'OTP verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token from cookie.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken as string | undefined;
      if (!refreshToken) {
        ApiResponse.error(res, 'MISSING_TOKEN', 'Refresh token not found', 401);
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      ApiResponse.success(res, {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      }, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Clear refresh token cookie.
   */
  async logout(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    ApiResponse.success(res, null, 'Logged out successfully');
  }

  /**
   * GET /api/v1/auth/profile
   * Get current user's profile.
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.id);
      ApiResponse.success(res, profile);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/auth/profile
   * Update current user's profile.
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.updateProfile(req.user!.id, req.body);
      ApiResponse.success(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const authController = new AuthController();
