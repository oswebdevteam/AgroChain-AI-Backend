import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middleware/validate.middleware';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authRateLimiter } from '../../common/middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  otpRequestSchema,
  verifyOtpSchema,
  updateProfileSchema,
} from './auth.schema';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, role]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [BUYER, SELLER, ADMIN] }
 *               phone: { type: string }
 *               fullName: { type: string }
 *     responses:
 *       201: { description: User registered successfully }
 *       409: { description: Email already exists }
 */
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register.bind(authController)
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  authController.login.bind(authController)
);

/**
 * @swagger
 * /auth/otp/request:
 *   post:
 *     summary: Request OTP via phone
 *     tags: [Auth]
 *     security: []
 */
router.post(
  '/otp/request',
  authRateLimiter,
  validate({ body: otpRequestSchema }),
  authController.requestOtp.bind(authController)
);

/**
 * @swagger
 * /auth/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [Auth]
 *     security: []
 */
router.post(
  '/otp/verify',
  authRateLimiter,
  validate({ body: verifyOtpSchema }),
  authController.verifyOtp.bind(authController)
);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and clear refresh token
 *     tags: [Auth]
 */
router.post('/logout', authController.logout.bind(authController));

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 */
router.get('/profile', authenticate, authController.getProfile.bind(authController));

/**
 * @swagger
 * /auth/profile:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 */
router.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateProfile.bind(authController)
);

/**
 * @swagger
 * /auth/sellers:
 *   get:
 *     summary: Search for seller profiles
 *     tags: [Auth]
 */
router.get('/sellers', authenticate, authController.searchSellers.bind(authController));

export { router as authRoutes };
