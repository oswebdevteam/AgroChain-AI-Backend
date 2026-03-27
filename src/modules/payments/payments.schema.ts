/**
 * ============================================
 * AgroChain AI — Payments Validation Schemas
 * ============================================
 */

import { z } from 'zod';

export const initiatePaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

/** Schema for the raw Interswitch webhook payload */
export const interswitchWebhookSchema = z.object({
  transactionRef: z.string().min(1),
  paymentReference: z.string().min(1),
  amount: z.number(),
  responseCode: z.string(),
  responseDescription: z.string(),
  merchantCode: z.string(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
export type InterswitchWebhookInput = z.infer<typeof interswitchWebhookSchema>;
