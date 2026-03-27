import { supabaseAdmin } from '../../config/supabase';
import { EscrowRow, EscrowInsert, EscrowUpdate, EscrowStatus } from '../../common/types';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';

const logger = createModuleLogger('escrow-repository');

export class EscrowRepository {
  /**
   * Create a new escrow record.
   */
  async create(data: EscrowInsert): Promise<EscrowRow> {
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .insert(data)
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to create escrow');
      throw AppError.internal(`Failed to create escrow: ${error.message}`);
    }

    return escrow;
  }

  /**
   * Find escrow by order ID.
   */
  async findByOrderId(orderId: string): Promise<EscrowRow | null> {
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, orderId }, 'Failed to fetch escrow');
      throw AppError.internal(`Failed to fetch escrow: ${error.message}`);
    }

    return escrow;
  }

  /**
   * Find escrow by ID.
   */
  async findById(id: string): Promise<EscrowRow | null> {
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      logger.error({ error, id }, 'Failed to fetch escrow');
      throw AppError.internal(`Failed to fetch escrow: ${error.message}`);
    }

    return escrow;
  }

  /**
   * Update escrow record.
   */
  async update(id: string, data: EscrowUpdate): Promise<EscrowRow> {
    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error({ error, id }, 'Failed to update escrow');
      throw AppError.internal(`Failed to update escrow: ${error.message}`);
    }

    return escrow;
  }

  /**
   * Update escrow status with optimistic concurrency.
   */
  async updateStatus(
    id: string,
    newStatus: EscrowStatus,
    currentStatus: EscrowStatus,
    additionalData?: Partial<EscrowUpdate>
  ): Promise<EscrowRow> {
    const updateData: EscrowUpdate = {
      status: newStatus,
      ...additionalData,
    };

    if (newStatus === EscrowStatus.RELEASED) {
      updateData.released_at = new Date().toISOString();
    }

    const { data: escrow, error } = await supabaseAdmin
      .from('escrows')
      .update(updateData)
      .eq('id', id)
      .eq('status', currentStatus)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw AppError.conflict(
          `Cannot update escrow status from ${currentStatus} to ${newStatus}. Escrow may have been modified.`
        );
      }
      logger.error({ error, id }, 'Failed to update escrow status');
      throw AppError.internal(`Failed to update escrow: ${error.message}`);
    }

    return escrow;
  }
}

/** Singleton instance */
export const escrowRepository = new EscrowRepository();
