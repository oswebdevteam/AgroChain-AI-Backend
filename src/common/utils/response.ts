import { Response } from 'express';
import { PaginationMeta } from '../types';

export class ApiResponse {
  /**
   * Send a successful response.
   *
   * @param res - Express response object
   * @param data - Response payload
   * @param message - Optional human-readable message
   * @param statusCode - HTTP status code (default 200)
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json({
      success: true,
      data,
      ...(message && { message }),
    });
  }

  /**
   * Send a successful response with pagination metadata.
   *
   * @param res - Express response object
   * @param data - Array of items
   * @param pagination - Pagination metadata
   * @param message - Optional human-readable message
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string
  ): void {
    res.status(200).json({
      success: true,
      data,
      pagination,
      ...(message && { message }),
    });
  }

  /**
   * Send a created response (201).
   */
  static created<T>(res: Response, data: T, message?: string): void {
    ApiResponse.success(res, data, message, 201);
  }

  /**
   * Send a no-content response (204).
   */
  static noContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Send an error response.
   *
   * @param res - Express response object
   * @param error - Error code string
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code (default 500)
   */
  static error(
    res: Response,
    error: string,
    message: string,
    statusCode: number = 500
  ): void {
    res.status(statusCode).json({
      success: false,
      error,
      message,
    });
  }
}
