/**
 * ============================================
 * AgroChain AI — Orders Validation Schemas
 * ============================================
 */

import { z } from 'zod';
import { Currency } from '../../common/types';

export const createOrderSchema = z.object({
  sellerId: z.string().uuid('Invalid seller ID'),
  produceType: z.string().min(2, 'Produce type is required').max(100),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20), // kg, tonnes, bags, etc.
  unitPrice: z.number().positive('Unit price must be positive'),
  currency: z.nativeEnum(Currency).optional().default(Currency.NGN),
  deliveryAddress: z.string().min(5, 'Delivery address is required').max(500),
  notes: z.string().max(1000).optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export const confirmDeliverySchema = z.object({
  deliveryProofUrl: z.string().url('Invalid URL').optional(),
});

export const orderFiltersSchema = z.object({
  status: z.string().optional(),
  produceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
