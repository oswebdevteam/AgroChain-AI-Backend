/**
 * ============================================
 * AgroChain AI — Validate Middleware Unit Tests
 * ============================================
 */

import { Request, Response, NextFunction } from 'express';
import { validate } from '../../../src/common/middleware/validate.middleware';
import { z, ZodError } from 'zod';

describe('Validate Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it('should pass valid body through', () => {
    const schema = z.object({ name: z.string() });
    req.body = { name: 'Test' };

    validate({ body: schema })(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Test' });
  });

  it('should pass ZodError for invalid body', () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    req.body = { name: 123 };

    validate({ body: schema })(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.any(ZodError));
  });

  it('should validate params', () => {
    const schema = z.object({ id: z.string().uuid() });
    req.params = { id: '00000000-0000-4000-a000-000000000001' };

    validate({ params: schema })(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should validate query', () => {
    const schema = z.object({ page: z.string().optional() });
    req.query = { page: '1' } as Record<string, string>;

    validate({ query: schema })(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('should strip extra fields via Zod', () => {
    const schema = z.object({ name: z.string() });
    req.body = { name: 'Test', extra: 'field' };

    validate({ body: schema })(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith();
    // Zod strips unknown keys by default
    expect(req.body).toEqual({ name: 'Test' });
  });
});
