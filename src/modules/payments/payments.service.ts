import { config } from '../../config/env';
import { ordersRepository } from '../orders/orders.repository';
import { paymentsRepository } from './payments.repository';
import { escrowService } from '../escrow/escrow.service';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import {
  OrderStatus,
  TransactionType,
  Currency,
} from '../../common/types';
import {
  generateTransactionRef,
  hmacSha512,
  secureCompare,
  generateUUID,
} from '../../common/utils/crypto';

const logger = createModuleLogger('payments-service');

/** Cached Interswitch OAuth token */
interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export class PaymentsService {
  private cachedToken: CachedToken | null = null;

  /**
   * Get OAuth2 access token from Interswitch.
   * Caches token until expiry to avoid redundant auth calls.
   *
   * @returns Bearer access token string
   */
  async getInterswitchToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60000) {
      return this.cachedToken.accessToken;
    }

    logger.info('Requesting new Interswitch OAuth token');

    const credentials = Buffer.from(
      `${config.INTERSWITCH_CLIENT_ID}:${config.INTERSWITCH_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch(
      `${config.INTERSWITCH_BASE_URL}/passport/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, body: errorText }, 'Interswitch token request failed');
      throw AppError.badGateway('Failed to authenticate with payment gateway');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };

    this.cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.cachedToken.accessToken;
  }

  /**
   * Initiate a payment for an order via Interswitch.
   *
   * Flow:
   * 1. Validate order exists and is PENDING
   * 2. Check idempotency — skip if already initiated
   * 3. Generate unique transactionRef
   * 4. Call Interswitch /api/v3/purchases endpoint
   * 5. Store pending transaction record
   * 6. Return payment reference for client to complete payment
   *
   * @param orderId - Order to pay for
   * @param userId - Authenticated user (must be the buyer)
   * @returns Payment reference and redirect data
   */
  async initiatePayment(
    orderId: string,
    userId: string
  ): Promise<{
    transactionRef: string;
    paymentReference: string;
    redirectUrl: string;
    amount: number;
  }> {
    logger.info({ orderId, userId }, 'Initiating payment');

    // Step 1: Validate order
    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }
    if (order.buyer_id !== userId) {
      throw AppError.forbidden('Only the buyer can pay for this order');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw AppError.conflict(`Cannot pay for order with status: ${order.status}`);
    }

    // Step 2: Idempotency check — find existing pending payment for this order
    const existingTransactions = await paymentsRepository.findByOrderId(orderId);
    const pendingPayment = existingTransactions.find(
      (t) => t.type === TransactionType.PAYMENT && t.metadata?.status === 'PENDING'
    );
    if (pendingPayment) {
      logger.info({ orderId, ref: pendingPayment.interswitch_ref }, 'Returning existing pending payment');
      return {
        transactionRef: (pendingPayment.metadata as Record<string, string>).transactionRef,
        paymentReference: pendingPayment.interswitch_ref ?? '',
        redirectUrl: (pendingPayment.metadata as Record<string, string>).redirectUrl ?? '',
        amount: pendingPayment.amount,
      };
    }

    // Step 3: Generate unique transaction reference
    const transactionRef = generateTransactionRef();

    // Step 4: Call Interswitch Purchase API (or use mock in development)
    let interswitchResponse: { paymentReference: string; redirectUrl: string };

    if (config.NODE_ENV === 'development' || !config.INTERSWITCH_CLIENT_SECRET || config.INTERSWITCH_CLIENT_SECRET === 'secret') {
      // --- MOCK PAYMENT (sandbox/dev mode) ---
      const mockRef = `MOCK-${transactionRef}`;
      const verifyUrl = `${config.FRONTEND_URL}/payment/callback?ref=${mockRef}`;
      logger.warn({ orderId, transactionRef }, 'Using MOCK payment (dev mode) — no real gateway call');
      interswitchResponse = {
        paymentReference: mockRef,
        redirectUrl: verifyUrl,
      };
    } else {
      // --- REAL INTERSWITCH CALL ---
      const token = await this.getInterswitchToken();
      const amountInKobo = Math.round(order.total_amount * 100);

      const purchasePayload = {
        merchant_code: config.INTERSWITCH_MERCHANT_CODE,
        pay_item_id: config.INTERSWITCH_PAYMENT_ITEM_ID,
        txn_ref: transactionRef,
        amount: amountInKobo,
        currency: order.currency === Currency.USD ? '840' : '566',
        cust_id: userId,
        cust_name: userId,
        pay_item_name: `AgroChain Order: ${order.produce_type}`,
        site_redirect_url: `${config.FRONTEND_URL}/payment/callback`,
      };

      try {
        const response = await fetch(
          `${config.INTERSWITCH_BASE_URL}/api/v3/purchases`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(purchasePayload),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error({ status: response.status, body: errorBody }, 'Interswitch purchase request failed');
          throw AppError.badGateway('Payment gateway request failed');
        }

        interswitchResponse = (await response.json()) as {
          paymentReference: string;
          redirectUrl: string;
        };
      } catch (error) {
        if (error instanceof AppError) throw error;
        logger.error({ error }, 'Interswitch API call failed');
        throw AppError.badGateway('Unable to reach payment gateway');
      }
    }

    // Step 5: Store pending transaction record
    await paymentsRepository.create({
      id: generateUUID(),
      order_id: orderId,
      type: TransactionType.PAYMENT,
      amount: order.total_amount,
      currency: order.currency,
      interswitch_ref: interswitchResponse.paymentReference,
      metadata: {
        transactionRef,
        status: 'PENDING',
        redirectUrl: interswitchResponse.redirectUrl,
        initiatedAt: new Date().toISOString(),
      },
    });

    logger.info(
      { orderId, transactionRef, paymentRef: interswitchResponse.paymentReference },
      'Payment initiated successfully'
    );

    return {
      transactionRef,
      paymentReference: interswitchResponse.paymentReference,
      redirectUrl: interswitchResponse.redirectUrl,
      amount: order.total_amount,
    };
  }

  /**
   * Handle Interswitch webhook callback.
   *
   * Security flow:
   * 1. Verify HMAC-SHA512 signature from Interswitch
   * 2. Idempotency check — skip if already processed
   * 3. On success (responseCode '00') → update order to PAID → create escrow
   * 4. On failure → record failure in transaction metadata
   *
   * @param payload - Webhook request body
   * @param signature - X-Interswitch-Signature header
   * @param rawBody - Raw request body string for signature verification
   */
  async handleWebhook(
    payload: {
      transactionRef: string;
      paymentReference: string;
      amount: number;
      responseCode: string;
      responseDescription: string;
      merchantCode: string;
    },
    signature: string,
    rawBody: string
  ): Promise<void> {
    logger.info(
      { transactionRef: payload.transactionRef, responseCode: payload.responseCode },
      'Processing Interswitch webhook'
    );

    // Step 1: Verify webhook signature
    const expectedSignature = hmacSha512(rawBody, config.INTERSWITCH_WEBHOOK_SECRET);
    const isValid = secureCompare(
      signature.toLowerCase(),
      expectedSignature.toLowerCase()
    );

    if (!isValid) {
      if (config.NODE_ENV === 'development') {
        logger.warn(
          {
            expected: expectedSignature,
            received: signature,
            instruction: 'Proceeding anyway due to development mode',
          },
          'Webhook signature verification failed — BYPASS ENABLED'
        );
      } else {
        logger.warn('Webhook signature verification failed');
        throw AppError.unauthorized('Invalid webhook signature');
      }
    }

    // Step 2: Idempotency check
    const existingTransaction = await paymentsRepository.findByInterswitchRef(
      payload.paymentReference
    );
    if (existingTransaction && (existingTransaction.metadata as Record<string, string>)?.status === 'COMPLETED') {
      logger.info({ paymentRef: payload.paymentReference }, 'Webhook already processed — skipping');
      return;
    }

    // Step 3: Find the pending transaction
    const pendingTransaction = existingTransaction;
    if (!pendingTransaction) {
      logger.warn({ paymentRef: payload.paymentReference }, 'No matching transaction found for webhook');
      throw AppError.notFound('Transaction not found');
    }

    // Step 4: Process based on response code
    const isSuccess = payload.responseCode === '00';

    if (isSuccess) {
      logger.info({ orderId: pendingTransaction.order_id }, 'Payment successful — creating escrow');

      // Update transaction to COMPLETED
      await paymentsRepository.update(pendingTransaction.id, {
        metadata: {
          ...(pendingTransaction.metadata as Record<string, unknown>),
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          responseCode: payload.responseCode,
          responseDescription: payload.responseDescription,
        },
      });

      // Update order status to PAID
      await ordersRepository.updateStatus(
        pendingTransaction.order_id,
        OrderStatus.PAID,
        OrderStatus.PENDING
      );

      // Create escrow (Phase 1 — funds logically held)
      await escrowService.createEscrow(
        pendingTransaction.order_id,
        pendingTransaction.amount,
        payload.paymentReference
      );
    } else {
      logger.warn(
        { responseCode: payload.responseCode, description: payload.responseDescription },
        'Payment failed'
      );

      // Update transaction with failure details
      await paymentsRepository.update(pendingTransaction.id, {
        metadata: {
          ...(pendingTransaction.metadata as Record<string, unknown>),
          status: 'FAILED',
          failedAt: new Date().toISOString(),
          responseCode: payload.responseCode,
          responseDescription: payload.responseDescription,
        },
      });
    }
  }

  /**
   * Verify a payment status by re-querying Interswitch.
   * Used for reconciliation after timeouts or missed webhooks.
   *
   * @param transactionRef - The original transaction reference
   * @returns Payment status
   */
  async verifyPayment(transactionRef: string): Promise<{
    status: string;
    amount: number;
    responseCode: string;
    responseDescription: string;
    orderId?: string;
  }> {
    // --- MOCK PAYMENT VERIFICATION (dev mode) ---
    if (transactionRef.startsWith('MOCK-')) {
      logger.warn({ transactionRef }, 'Mock payment verification — auto-succeeding');

      // Find the transaction by interswitch_ref
      const transaction = await paymentsRepository.findByInterswitchRef(transactionRef);
      if (!transaction) {
        throw AppError.notFound('Mock transaction not found');
      }

      // Skip if already completed
      const meta = transaction.metadata as Record<string, unknown>;
      if (meta?.status === 'COMPLETED') {
        return {
          status: 'COMPLETED',
          amount: transaction.amount,
          responseCode: '00',
          responseDescription: 'Mock payment already completed',
          orderId: transaction.order_id,
        };
      }

      // Mark transaction as COMPLETED
      await paymentsRepository.update(transaction.id, {
        metadata: {
          ...meta,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
          responseCode: '00',
          responseDescription: 'Mock payment successful',
        },
      });

      // Update order status to PAID
      await ordersRepository.updateStatus(
        transaction.order_id,
        OrderStatus.PAID,
        OrderStatus.PENDING
      );

      // Create escrow
      await escrowService.createEscrow(
        transaction.order_id,
        transaction.amount,
        transactionRef
      );

      return {
        status: 'SUCCESS',
        amount: transaction.amount,
        responseCode: '00',
        responseDescription: 'Mock payment successful',
        orderId: transaction.order_id,
      };
    }

    // --- REAL INTERSWITCH VERIFICATION ---
    const token = await this.getInterswitchToken();

    const response = await fetch(
      `${config.INTERSWITCH_BASE_URL}/api/v3/purchases?transactionRef=${transactionRef}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw AppError.badGateway('Failed to verify payment with gateway');
    }

    const data = (await response.json()) as {
      amount: number;
      responseCode: string;
      responseDescription: string;
    };

    return {
      status: data.responseCode === '00' ? 'COMPLETED' : 'FAILED',
      amount: data.amount / 100, // Convert from kobo to naira
      responseCode: data.responseCode,
      responseDescription: data.responseDescription,
    };
  }

  /**
   * Process payout to seller via Interswitch transfer API.
   * Called when escrow is released.
   *
   * NOTE: In sandbox/testnet, this logs the payout intent.
   * In production, this would call Interswitch's payout/transfer API.
   *
   * @param sellerId - Seller's user ID
   * @param amount - Amount to pay out
   * @param orderId - Associated order ID
   * @returns Payout reference
   */
  async processPayout(
    sellerId: string,
    amount: number,
    orderId: string
  ): Promise<string> {
    logger.info({ sellerId, amount, orderId }, 'Processing seller payout');

    // In production: call Interswitch payout/transfer API
    // For sandbox: generate a mock payout reference
    const payoutRef = `PAYOUT-${generateTransactionRef()}`;

    // Record the payout transaction
    await paymentsRepository.create({
      id: generateUUID(),
      order_id: orderId,
      type: TransactionType.PAYOUT,
      amount,
      currency: Currency.NGN,
      interswitch_ref: payoutRef,
      metadata: {
        sellerId,
        status: 'COMPLETED',
        note: 'Sandbox payout — production would call Interswitch transfer API',
        processedAt: new Date().toISOString(),
      },
    });

    logger.info({ payoutRef, sellerId, amount }, 'Payout processed');
    return payoutRef;
  }
}

/** Singleton instance */
export const paymentsService = new PaymentsService();
