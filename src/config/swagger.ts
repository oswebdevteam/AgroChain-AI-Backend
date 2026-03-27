import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

/**
 * OpenAPI 3.0 specification generated from JSDoc annotations on route files.
 * Served at /api/docs via swagger-ui-express.
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgroChain AI API',
      version: '1.0.0',
      description:
        'Financial infrastructure layer for agricultural trade in Nigeria and emerging markets. ' +
        'Every agricultural trade becomes verified, trackable, transparent, and credit-worthy financial data.',
      contact: {
        name: 'AgroChain AI Support',
        email: 'support@agrochain.ai',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.PORT}/api/${config.API_VERSION}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT access token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/routes.ts', './src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
