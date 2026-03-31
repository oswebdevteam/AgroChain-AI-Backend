/**
 * ============================================
 * AgroChain AI — Payments Repository Bug Condition Exploration Tests
 * ============================================
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3**
 * 
 * CRITICAL: These tests are EXPECTED TO FAIL on unfixed code.
 * Test failure confirms the bug exists (Supabase coercion error instead of NotFound error).
 */

import { paymentsRepository } from '../../../src/modules/payments/payments.repository';
import { AppError } from '../../../src/common/errors/AppError';
import { supabaseAdmin } from '../../../src/config/supabase';
import { createTestTransaction } from '../../helpers/testData';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../../../src/config/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('PaymentsRepository - Bug Condition Exploration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 1: Bug Condition - Non-Existent Transaction Update Error', () => {
    /**
     * **Validates: Requirements 1.1, 1.2, 1.3**
     * 
     * This test verifies that updating a non-existent transaction throws
     * AppError.notFound('Transaction not found') instead of the Supabase
     * "Cannot coerce the result to a single JSON object" error.
     * 
     * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
     * - The test will fail because the current code throws AppError.internal
     *   with "Cannot coerce" message instead of AppError.notFound
     * 
     * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
     * - After the fix, this test will pass, confirming the bug is resolved
     */

    it('should throw AppError.notFound when updating non-existent transaction with zero UUID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { metadata: { status: 'COMPLETED' } };

      // Mock Supabase to simulate the "no rows returned" scenario
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: null,
          hint: null,
        },
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute and assert
      await expect(
        paymentsRepository.update(nonExistentId, updateData)
      ).rejects.toThrow(AppError);

      // Verify it's specifically a NotFound error (404)
      try {
        await paymentsRepository.update(nonExistentId, updateData);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('Transaction not found');
      }
    });

    it('should throw AppError.notFound when updating non-existent transaction with random UUID', async () => {
      const nonExistentId = uuidv4(); // Random UUID that doesn't exist
      const updateData = { metadata: { amount: 100 } };

      // Mock Supabase to simulate the "no rows returned" scenario
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: null,
          hint: null,
        },
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute and assert
      try {
        await paymentsRepository.update(nonExistentId, updateData);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('Transaction not found');
      }
    });

    it('should throw AppError.notFound when updating transaction after deletion scenario', async () => {
      // Simulate a scenario where a transaction existed but was deleted
      const deletedTransactionId = uuidv4();
      const updateData = { metadata: { status: 'VERIFIED' } };

      // Mock Supabase to simulate the "no rows returned" scenario (as if deleted)
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: null,
          hint: null,
        },
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute and assert
      try {
        await paymentsRepository.update(deletedTransactionId, updateData);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).message).toContain('Transaction not found');
      }
    });

    it('should throw AppError.notFound with correct error code', async () => {
      const nonExistentId = uuidv4();
      const updateData = { metadata: {} };

      // Mock Supabase to simulate the "no rows returned" scenario
      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: null,
          hint: null,
        },
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute and assert
      try {
        await paymentsRepository.update(nonExistentId, updateData);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).code).toBe('NOT_FOUND');
        expect((error as AppError).message).toContain('Transaction not found');
      }
    });
  });
});

describe('PaymentsRepository - Preservation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 2: Preservation - Valid Transaction Update Behavior', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     * 
     * These tests verify that updating existing transactions continues to work
     * correctly after the fix. They observe the current behavior on unfixed code
     * and ensure it's preserved.
     * 
     * EXPECTED OUTCOME ON UNFIXED CODE: Tests PASS
     * - These tests should pass on the current code, establishing baseline behavior
     * 
     * EXPECTED OUTCOME ON FIXED CODE: Tests PASS
     * - After the fix, these tests must still pass to ensure no regressions
     */

    it('should successfully update an existing transaction and return updated record', async () => {
      const existingId = uuidv4();
      const updateData = { metadata: { status: 'COMPLETED', completedAt: new Date().toISOString() } };
      const expectedRecord = createTestTransaction({
        id: existingId,
        metadata: updateData.metadata,
      });

      // Mock Supabase to simulate successful update
      const mockSingle = jest.fn().mockResolvedValue({
        data: expectedRecord,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute
      const result = await paymentsRepository.update(existingId, updateData);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.id).toBe(existingId);
      expect(result.metadata).toEqual(updateData.metadata);
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith('id', existingId);
    });

    it('should successfully update transaction metadata fields', async () => {
      const existingId = uuidv4();
      const updateData = {
        metadata: {
          status: 'VERIFIED',
          verifiedAt: new Date().toISOString(),
          responseCode: '00',
          responseDescription: 'Success',
        },
      };
      const expectedRecord = createTestTransaction({
        id: existingId,
        metadata: updateData.metadata,
      });

      // Mock Supabase to simulate successful update
      const mockSingle = jest.fn().mockResolvedValue({
        data: expectedRecord,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute
      const result = await paymentsRepository.update(existingId, updateData);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.metadata).toEqual(updateData.metadata);
    });

    it('should successfully update interswitch_ref field', async () => {
      const existingId = uuidv4();
      const updateData = { interswitch_ref: 'ISW-REF-12345' };
      const expectedRecord = createTestTransaction({
        id: existingId,
        interswitch_ref: updateData.interswitch_ref,
      });

      // Mock Supabase to simulate successful update
      const mockSingle = jest.fn().mockResolvedValue({
        data: expectedRecord,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute
      const result = await paymentsRepository.update(existingId, updateData);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.interswitch_ref).toBe(updateData.interswitch_ref);
    });

    it('should successfully update blockchain_hash field', async () => {
      const existingId = uuidv4();
      const updateData = { blockchain_hash: '0x1234567890abcdef' };
      const expectedRecord = createTestTransaction({
        id: existingId,
        blockchain_hash: updateData.blockchain_hash,
      });

      // Mock Supabase to simulate successful update
      const mockSingle = jest.fn().mockResolvedValue({
        data: expectedRecord,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute
      const result = await paymentsRepository.update(existingId, updateData);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.blockchain_hash).toBe(updateData.blockchain_hash);
    });

    it('should handle sequential updates to the same transaction', async () => {
      const existingId = uuidv4();
      
      // First update
      const updateData1 = { metadata: { status: 'PENDING' } };
      const expectedRecord1 = createTestTransaction({
        id: existingId,
        metadata: updateData1.metadata,
      });

      // Second update
      const updateData2 = { metadata: { status: 'COMPLETED', completedAt: new Date().toISOString() } };
      const expectedRecord2 = createTestTransaction({
        id: existingId,
        metadata: updateData2.metadata,
      });

      // Mock Supabase for first update
      const mockSingle1 = jest.fn().mockResolvedValue({
        data: expectedRecord1,
        error: null,
      });
      const mockSelect1 = jest.fn().mockReturnValue({ single: mockSingle1 });
      const mockEq1 = jest.fn().mockReturnValue({ select: mockSelect1 });
      const mockUpdate1 = jest.fn().mockReturnValue({ eq: mockEq1 });

      // Mock Supabase for second update
      const mockSingle2 = jest.fn().mockResolvedValue({
        data: expectedRecord2,
        error: null,
      });
      const mockSelect2 = jest.fn().mockReturnValue({ single: mockSingle2 });
      const mockEq2 = jest.fn().mockReturnValue({ select: mockSelect2 });
      const mockUpdate2 = jest.fn().mockReturnValue({ eq: mockEq2 });

      // Execute first update
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate1 });
      const result1 = await paymentsRepository.update(existingId, updateData1);

      // Execute second update
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate2 });
      const result2 = await paymentsRepository.update(existingId, updateData2);

      // Assert both updates succeeded
      expect(result1.metadata).toEqual(updateData1.metadata);
      expect(result2.metadata).toEqual(updateData2.metadata);
    });

    it('should update multiple fields simultaneously', async () => {
      const existingId = uuidv4();
      const updateData = {
        interswitch_ref: 'ISW-REF-67890',
        blockchain_hash: '0xabcdef1234567890',
        metadata: { status: 'COMPLETED', note: 'Payment verified' },
      };
      const expectedRecord = createTestTransaction({
        id: existingId,
        ...updateData,
      });

      // Mock Supabase to simulate successful update
      const mockSingle = jest.fn().mockResolvedValue({
        data: expectedRecord,
        error: null,
      });

      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      (supabaseAdmin.from as jest.Mock).mockReturnValue({ update: mockUpdate });

      // Execute
      const result = await paymentsRepository.update(existingId, updateData);

      // Assert
      expect(result).toEqual(expectedRecord);
      expect(result.interswitch_ref).toBe(updateData.interswitch_ref);
      expect(result.blockchain_hash).toBe(updateData.blockchain_hash);
      expect(result.metadata).toEqual(updateData.metadata);
    });
  });
});
