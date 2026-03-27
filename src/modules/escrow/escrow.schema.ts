import { z } from 'zod';

export const escrowOrderIdParamSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

export const refundEscrowSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});
