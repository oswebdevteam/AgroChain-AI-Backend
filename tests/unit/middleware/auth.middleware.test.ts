/**
 * ============================================
 * AgroChain AI — Auth Middleware Unit Tests
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../../src/common/middleware/auth.middleware';
import { UserRole } from '../../../src/common/types';

jest.mock('../../../src/config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }),
  },
}));
jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { supabaseAdmin } from '../../../src/config/supabase';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next with error when no Authorization header', async () => {
      await authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it('should call next with error for invalid token format', async () => {
      req.headers = { authorization: 'InvalidFormat token123' };
      await authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it('should authenticate valid token and attach user', async () => {
      req.headers = { authorization: 'Bearer valid-token' };

      (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
        error: null,
      });

      const mockFrom = supabaseAdmin.from as jest.Mock;
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { role: 'BUYER', email: 'test@test.com' },
          error: null,
        }),
      });

      await authenticate(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
      expect(req.user).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        role: 'BUYER',
      });
    });
  });

  describe('authorize', () => {
    it('should call next when user has required role', () => {
      req.user = { id: 'user-1', email: 'test@test.com', role: UserRole.ADMIN };
      const middleware = authorize(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with 403 when user lacks required role', () => {
      req.user = { id: 'user-1', email: 'test@test.com', role: UserRole.BUYER };
      const middleware = authorize(UserRole.ADMIN);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('should call next with 401 when no user attached', () => {
      const middleware = authorize(UserRole.BUYER);
      middleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });
  });
});
