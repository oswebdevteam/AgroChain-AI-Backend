/**
 * ============================================
 * AgroChain AI — Orders Service
 * ============================================
 * Business logic for the produce order lifecycle.
 * Handles creation, listing, delivery confirmation, and cancellation.
 */

import { ordersRepository } from './orders.repository';
import { authRepository } from '../auth/auth.repository';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import {
  OrderStatus,
  UserRole,
  Currency,
  ProduceOrderRow,
} from '../../common/types';
import { CreateOrderInput } from './orders.schema';
import { PaginationParams } from '../../common/utils/pagination';
import { generateUUID } from '../../common/utils/crypto';

const logger = createModuleLogger('orders-service');

export class OrdersService {
  /**
   * Create a new produce order.
   *
   * Validates:
   * - Seller exists and has SELLER role
   * - Buyer is not ordering from themselves
   * - Calculates total_amount = quantity * unitPrice
   *
   * @param buyerId - Authenticated buyer's user ID
   * @param input - Order creation data
   * @returns Created order
   */
  async createOrder(buyerId: string, input: CreateOrderInput): Promise<ProduceOrderRow> {
    logger.info({ buyerId, sellerId: input.sellerId, produceType: input.produceType }, 'Creating order');

    // Validate seller exists
    const sellerProfile = await authRepository.findProfileById(input.sellerId);
    if (!sellerProfile) {
      throw AppError.notFound('Seller not found');
    }
    if (sellerProfile.role !== UserRole.SELLER) {
      throw AppError.badRequest('Target user is not a registered seller');
    }

    // Prevent self-ordering
    if (buyerId === input.sellerId) {
      throw AppError.badRequest('Cannot create an order with yourself as both buyer and seller');
    }

    // Calculate total amount (financial precision: round to 2 decimals)
    const totalAmount = Math.round(input.quantity * input.unitPrice * 100) / 100;

    const order = await ordersRepository.create({
      id: generateUUID(),
      buyer_id: buyerId,
      seller_id: input.sellerId,
      produce_type: input.produceType,
      quantity: input.quantity,
      unit: input.unit,
      unit_price: input.unitPrice,
      total_amount: totalAmount,
      currency: input.currency ?? Currency.NGN,
      status: OrderStatus.PENDING,
      delivery_address: input.deliveryAddress,
      notes: input.notes ?? null,
    });

    logger.info({ orderId: order.id, totalAmount }, 'Order created successfully');
    return order;
  }

  /**
   * Get a single order by ID.
   * Enforces visibility: buyers see their orders, sellers see their orders, admins see all.
   *
   * @param orderId - Order UUID
   * @param userId - Requesting user's ID
   * @param userRole - Requesting user's role
   * @returns Order data
   */
  async getOrderById(
    orderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<ProduceOrderRow> {
    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    // Enforce visibility
    if (userRole !== UserRole.ADMIN) {
      if (order.buyer_id !== userId && order.seller_id !== userId) {
        throw AppError.forbidden('You do not have access to this order');
      }
    }

    return order;
  }

  /**
   * List orders with filters and pagination.
   * Automatically scoped by user role.
   */
  async listOrders(
    userId: string,
    userRole: UserRole,
    filters: {
      status?: string;
      produceType?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: PaginationParams
  ): Promise<{ orders: ProduceOrderRow[]; total: number }> {
    return ordersRepository.findMany(filters, pagination, userId, userRole);
  }

  /**
   * Confirm delivery of an order.
   * Only the seller can confirm delivery. Transitions from IN_ESCROW → DELIVERED.
   *
   * @param orderId - Order UUID
   * @param sellerId - Authenticated seller's user ID
   * @param deliveryProofUrl - Optional URL to delivery proof image
   * @returns Updated order
   */
  async confirmDelivery(
    orderId: string,
    sellerId: string,
    deliveryProofUrl?: string
  ): Promise<ProduceOrderRow> {
    logger.info({ orderId, sellerId }, 'Confirming delivery');

    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    // Only the seller can confirm delivery
    if (order.seller_id !== sellerId) {
      throw AppError.forbidden('Only the seller can confirm delivery');
    }

    // Order must be IN_ESCROW to be delivered
    if (order.status !== OrderStatus.IN_ESCROW) {
      throw AppError.conflict(
        `Cannot confirm delivery: order status is ${order.status}, expected IN_ESCROW`
      );
    }

    // Update order with delivery confirmation
    const updatedOrder = await ordersRepository.update(orderId, {
      status: OrderStatus.DELIVERED,
      delivery_proof_url: deliveryProofUrl ?? null,
    });

    logger.info({ orderId }, 'Delivery confirmed');
    return updatedOrder;
  }

  /**
   * Cancel a pending order.
   * Only the buyer can cancel, and only if the order is still PENDING.
   *
   * @param orderId - Order UUID
   * @param userId - Requesting user's ID
   * @returns Cancelled order
   */
  async cancelOrder(orderId: string, userId: string): Promise<ProduceOrderRow> {
    logger.info({ orderId, userId }, 'Cancelling order');

    const order = await ordersRepository.findById(orderId);
    if (!order) {
      throw AppError.notFound('Order not found');
    }

    if (order.buyer_id !== userId) {
      throw AppError.forbidden('Only the buyer can cancel this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw AppError.conflict(
        `Cannot cancel order: status is ${order.status}, only PENDING orders can be cancelled`
      );
    }

    const cancelledOrder = await ordersRepository.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      OrderStatus.PENDING
    );

    logger.info({ orderId }, 'Order cancelled');
    return cancelledOrder;
  }
}

/** Singleton instance */
export const ordersService = new OrdersService();
