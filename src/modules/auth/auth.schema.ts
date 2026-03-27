/**
 * ============================================
 * AgroChain AI — Auth Validation Schemas
 * ============================================
 * Zod schemas for auth endpoint request validation.
 */

import { z } from 'zod';
import { UserRole } from '../../common/types';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number'
    ),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: 'Role must be BUYER, SELLER, or ADMIN' }),
  }),
  phone: z.string().min(10).max(15).optional(),
  fullName: z.string().min(2).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const otpRequestSchema = z.object({
  phone: z.string().min(10, 'Invalid phone number').max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  token: z.string().length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(15).optional(),
  walletAddress: z.string().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
