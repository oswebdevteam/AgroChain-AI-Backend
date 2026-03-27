/**
 * ============================================
 * AgroChain AI — Orders Controller
 * ============================================
 * Thin controller: routing + delegation to OrdersService.
 */

import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service';
import { ApiResponse } from '../../common/utils/response';
import {
  parsePaginationParams,
  buildPaginationMeta,
} from '../../common/utils/pagination';

export class OrdersController {
  /**
   * POST /api/v1/orders
   * Create a new produce order (buyer only).
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.createOrder(req.user!.id, req.body);
      ApiResponse.created(res, order, 'Order created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders/:id
   * Get a single order by ID.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.getOrderById(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/orders
   * List orders with filters and pagination.
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pagination = parsePaginationParams(req.query);
      const filters = {
        status: req.query.status as string | undefined,
        produceType: req.query.produceType as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };

      const { orders, total } = await ordersService.listOrders(
        req.user!.id,
        req.user!.role,
        filters,
        pagination
      );

      const paginationMeta = buildPaginationMeta(total, pagination);
      ApiResponse.paginated(res, orders, paginationMeta);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:id/confirm-delivery
   * Seller confirms delivery.
   */
  async confirmDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.confirmDelivery(
        req.params.id,
        req.user!.id,
        req.body.deliveryProofUrl
      );
      ApiResponse.success(res, order, 'Delivery confirmed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/orders/:id/cancel
   * Buyer cancels a pending order.
   */
  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await ordersService.cancelOrder(req.params.id, req.user!.id);
      ApiResponse.success(res, order, 'Order cancelled');
    } catch (error) {
      next(error);
    }
  }
}

/** Singleton instance */
export const ordersController = new OrdersController();
