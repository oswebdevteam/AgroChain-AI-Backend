/**
 * ============================================
 * AgroChain AI — Express Application Setup
 * ============================================
 * Configures Express with all middleware, routes, and error handling.
 * Middleware chain order matters — security first, then logging, then parsing, then routes.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { swaggerSpec } from './config/swagger';
import { globalRateLimiter } from './common/middleware/rateLimiter.middleware';
import { requestLogger } from './common/middleware/requestLogger.middleware';
import { errorHandler } from './common/middleware/error.middleware';

// Module routes
import { authRoutes } from './modules/auth/auth.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { paymentsRoutes, webhookRoutes } from './modules/payments/payments.routes';
import { escrowRoutes } from './modules/escrow/escrow.routes';
import { blockchainRoutes } from './modules/blockchain/blockchain.routes';
import { aiRoutes } from './modules/ai/ai.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';

const app = express();

// ============================================
// Security Middleware
// ============================================

/** Helmet with strict CSP */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Swagger UI
  })
);

/** CORS — restricted to configured frontend origins */
app.use(
  cors({
    origin: config.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================
// Parsing & Logging Middleware
// ============================================

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ============================================
// Rate Limiting (global)
// ============================================

app.use(globalRateLimiter);

// ============================================
// Health Check (no auth required)
// ============================================

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.NODE_ENV,
    },
  });
});

// ============================================
// API Documentation
// ============================================

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AgroChain AI — API Documentation',
}));

app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// API Routes (versioned under /api/v1/)
// ============================================

const apiPrefix = `/api/${config.API_VERSION}`;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/orders`, ordersRoutes);
app.use(`${apiPrefix}/payments`, paymentsRoutes);
app.use(`${apiPrefix}/webhooks`, webhookRoutes);
app.use(`${apiPrefix}/escrow`, escrowRoutes);
app.use(`${apiPrefix}/blockchain`, blockchainRoutes);
app.use(`${apiPrefix}`, aiRoutes); // /api/v1/users/:id/financial-identity
app.use(`${apiPrefix}/analytics`, analyticsRoutes);

// ============================================
// 404 Handler
// ============================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
  });
});

// ============================================
// Centralized Error Handler (must be LAST)
// ============================================

app.use(errorHandler);

export { app };
