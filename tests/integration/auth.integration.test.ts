/**
 * ============================================
 * AgroChain AI — Auth Integration Tests
 * ============================================
 */

import request from 'supertest';
import { app } from '../../src/app';

jest.mock('../../../src/modules/auth/auth.service', () => ({
  authService: {
    register: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', role: 'BUYER' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    }),
    login: jest.fn().mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', role: 'BUYER' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    }),
    getProfile: jest.fn().mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      role: 'BUYER',
      full_name: 'Test User',
    }),
  },
}));

jest.mock('../../../src/common/middleware/auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-1', email: 'test@test.com', role: 'BUYER' };
    next();
  },
  authorize: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), child: jest.fn().mockReturnThis() },
  createModuleLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}));
jest.mock('../../../src/common/middleware/requestLogger.middleware', () => ({
  requestLogger: (_req: any, _res: any, next: any) => next(),
}));

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'SecurePass123',
          role: 'BUYER',
          fullName: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      // Verify httpOnly cookie was set
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'SecurePass123',
          role: 'BUYER',
        });

      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: '123',
          role: 'BUYER',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@test.com',
          password: 'SecurePass123',
          role: 'INVALID_ROLE',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'SecurePass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return authenticated user profile', async () => {
      const res = await request(app).get('/api/v1/auth/profile');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('user-1');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear refresh token cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
