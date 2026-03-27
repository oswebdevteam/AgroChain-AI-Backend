/**
 * ============================================
 * AgroChain AI — Blockchain Repository
 * ============================================
 * Supabase data access layer for blockchain event logs.
 */

import { supabaseAdmin } from '../../config/supabase';
import { BlockchainLogRow, BlockchainLogInsert } from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('blockchain-repository');

export class BlockchainRepository {
  /**
   * Create a blockchain log entry.
   */
  async create(data: BlockchainLogInsert): Promise<BlockchainLogRow> {
    const { data: log, error } = await supabaseAdmin
      .from('blockchain_logs')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create blockchain log');
      throw AppError.internal(`Failed to create blockchain log: ${error.message}`);
    }

    return log;
  }

  /**
   * Find all blockchain logs for an order.
   */
  async findByOrderId(orderId: string): Promise<BlockchainLogRow[]> {
    const { data: logs, error } = await supabaseAdmin
      .from('blockchain_logs')
      .select('*')
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });

    if (error) {
      logger.error({ error, orderId }, 'Failed to fetch blockchain logs');
      throw AppError.internal(`Failed to fetch blockchain logs: ${error.message}`);
    }

    return logs ?? [];
  }

  /**
   * Check if a trade has already been recorded on-chain (idempotency).
   */
  async existsForOrder(orderId: string, eventType: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
      .from('blockchain_logs')
      .select('id', { count: 'exact', head: true })
      .eq('order_id', orderId)
      .eq('event_type', eventType);

    if (error) {
      logger.error({ error }, 'Failed to check blockchain log existence');
      throw AppError.internal(`Failed to check blockchain log: ${error.message}`);
    }

    return (count ?? 0) > 0;
  }
}

/** Singleton instance */
export const blockchainRepository = new BlockchainRepository();
