import { supabaseAdmin } from '../../config/supabase';
import {
  TransactionRecordRow,
  TransactionRecordInsert,
  TransactionRecordUpdate,
} from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('payments-repository');

export class PaymentsRepository {
  /**
   * Create a transaction record.
   * Used to log every payment, escrow hold, release, and refund.
   */
  async create(data: TransactionRecordInsert): Promise<TransactionRecordRow> {
    const { data: record, error } = await supabaseAdmin
      .from('transaction_records')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create transaction record');
      throw AppError.internal(`Failed to create transaction record: ${error.message}`);
    }

    return record;
  }

  /**
   * Find transaction record by Interswitch reference.
   * Used for idempotency checks to prevent double processing.
   */
  async findByInterswitchRef(ref: string): Promise<TransactionRecordRow | null> {
    const { data: record, error } = await supabaseAdmin
      .from('transaction_records')
      .select('*')
      .eq('interswitch_ref', ref)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error }, 'Failed to find transaction by reference');
      throw AppError.internal(`Failed to find transaction: ${error.message}`);
    }

    return record;
  }

  /**
   * Find all transaction records for an order.
   */
  async findByOrderId(orderId: string): Promise<TransactionRecordRow[]> {
    const { data: records, error } = await supabaseAdmin
      .from('transaction_records')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error({ error, orderId }, 'Failed to fetch transactions for order');
      throw AppError.internal(`Failed to fetch transactions: ${error.message}`);
    }

    return records ?? [];
  }

  /**
   * Update a transaction record.
   */
  async update(id: string, data: TransactionRecordUpdate): Promise<TransactionRecordRow> {
    const { data: record, error } = await supabaseAdmin
      .from('transaction_records')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Check if the error is due to no rows being returned (transaction not found)
      if (error.code === 'PGRST116') {
        logger.warn({ id }, 'Transaction not found for update');
        throw AppError.notFound('Transaction not found');
      }
      logger.error({ error, id }, 'Failed to update transaction record');
      throw AppError.internal(`Failed to update transaction: ${error.message}`);
    }

    return record;
  }

  /**
   * Find transaction by custom reference (AGRO-xxx idempotency key).
   */
  async findByTransactionRef(ref: string): Promise<TransactionRecordRow | null> {
    const { data, error } = await supabaseAdmin
      .from('transaction_records')
      .select('*')
      .contains('metadata', { transactionRef: ref })
      .maybeSingle();

    if (error) {
      logger.error({ error }, 'Failed to find by transaction ref');
      throw AppError.internal(`Failed to find transaction: ${error.message}`);
    }

    return data;
  }
}

/** Singleton instance */
export const paymentsRepository = new PaymentsRepository();
