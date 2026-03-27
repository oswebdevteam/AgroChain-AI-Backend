/**
 * ============================================
 * AgroChain AI — Interswitch Mock Helpers
 * ============================================
 */

export const mockInterswitchTokenResponse = {
  access_token: 'mock-interswitch-access-token',
  token_type: 'Bearer',
  expires_in: 3600,
};

export const mockInterswitchPurchaseResponse = {
  paymentReference: 'ISW-PAY-REF-001',
  redirectUrl: 'https://sandbox.interswitchng.com/pay/mock-redirect',
  transactionRef: 'AGRO-test-123',
  amount: 5000000, // in kobo
  responseCode: '00',
  responseDescription: 'Successful',
};

export const mockInterswitchWebhookPayload = {
  transactionRef: 'AGRO-test-123',
  paymentReference: 'ISW-PAY-REF-001',
  amount: 5000000,
  responseCode: '00',
  responseDescription: 'Approved Successful',
  merchantCode: 'MER123',
};

export const mockInterswitchFailedWebhook = {
  transactionRef: 'AGRO-test-456',
  paymentReference: 'ISW-PAY-REF-002',
  amount: 5000000,
  responseCode: '51',
  responseDescription: 'Insufficient Funds',
  merchantCode: 'MER123',
};

/**
 * Generate a mock Interswitch webhook signature.
 */
export function generateMockWebhookSignature(
  payload: string,
  secret: string
): string {
  const crypto = require('crypto');
  return crypto.createHmac('sha512', secret).update(payload).digest('hex');
}
