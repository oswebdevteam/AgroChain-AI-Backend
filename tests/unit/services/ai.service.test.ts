/**
 * ============================================
 * AgroChain AI — AI Service Unit Tests
 * ============================================
 */

import { AiService } from '../../../src/modules/ai/ai.service';
import { aiRepository } from '../../../src/modules/ai/ai.repository';
import { FinancingEligibility } from '../../../src/common/types';
import { mockCreditAnalysisResponse } from '../../helpers/mockOpenAI';

jest.mock('../../../src/modules/ai/ai.repository');
jest.mock('../../../src/config/env', () => ({
  config: {
    OPENAI_API_KEY: 'sk-test',
    OPENAI_MODEL: 'gpt-4o',
    OPENAI_MAX_TOKENS: 1500,
  },
}));
jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify(mockCreditAnalysisResponse),
            },
          }],
        }),
      },
    },
  }));
});

describe('AiService', () => {
  let service: AiService;

  beforeEach(() => {
    service = new AiService();
    jest.clearAllMocks();
  });

  describe('analyzeTraderProfile', () => {
    it('should create default identity for user with no trades', async () => {
      const defaultIdentity = {
        user_id: 'user-1',
        credit_readiness_score: 0,
        financing_eligibility: FinancingEligibility.NEEDS_MORE_DATA,
      };

      (aiRepository.getTraderStats as jest.Mock).mockResolvedValue({
        role: 'BUYER',
        total_trades: 0,
        total_volume: 0,
        avg_order_value: 0,
        on_time_delivery_rate: 0,
        dispute_rate: 0,
        cancellation_rate: 0,
        trade_frequency_per_month: 0,
        months_active: 0,
        firstTradeDate: null,
      });
      (aiRepository.upsert as jest.Mock).mockResolvedValue(defaultIdentity);

      const result = await service.analyzeTraderProfile('user-1');
      expect(result.credit_readiness_score).toBe(0);
      expect(result.financing_eligibility).toBe(FinancingEligibility.NEEDS_MORE_DATA);
    });

    it('should call OpenAI and store results for user with trades', async () => {
      const storedIdentity = {
        user_id: 'user-1',
        credit_readiness_score: 72,
        financing_eligibility: FinancingEligibility.ELIGIBLE,
      };

      (aiRepository.getTraderStats as jest.Mock).mockResolvedValue({
        role: 'SELLER',
        total_trades: 15,
        total_volume: 750000,
        avg_order_value: 50000,
        on_time_delivery_rate: 0.93,
        dispute_rate: 0.02,
        cancellation_rate: 0.05,
        trade_frequency_per_month: 3.5,
        months_active: 4,
        firstTradeDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      });
      (aiRepository.upsert as jest.Mock).mockResolvedValue(storedIdentity);

      const result = await service.analyzeTraderProfile('user-1');
      expect(result.credit_readiness_score).toBe(72);
      expect(aiRepository.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFinancialIdentity', () => {
    it('should return existing identity', async () => {
      const identity = {
        user_id: 'user-1',
        credit_readiness_score: 72,
      };
      (aiRepository.findByUserId as jest.Mock).mockResolvedValue(identity);

      const result = await service.getFinancialIdentity('user-1');
      expect(result).toEqual(identity);
    });

    it('should throw 404 if no identity found', async () => {
      (aiRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      await expect(service.getFinancialIdentity('user-1')).rejects.toThrow('not found');
    });
  });

  describe('fallback scoring', () => {
    it('should generate reasonable score when OpenAI fails', async () => {
      // Override OpenAI mock to throw
      const OpenAI = require('openai');
      OpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API limit exceeded')),
          },
        },
      }));

      const fallbackService = new AiService();

      (aiRepository.getTraderStats as jest.Mock).mockResolvedValue({
        role: 'SELLER',
        total_trades: 20,
        total_volume: 1000000,
        avg_order_value: 50000,
        on_time_delivery_rate: 0.95,
        dispute_rate: 0,
        cancellation_rate: 0.05,
        trade_frequency_per_month: 5,
        months_active: 4,
        firstTradeDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      });
      (aiRepository.upsert as jest.Mock).mockImplementation(async (data) => data);

      const result = await fallbackService.analyzeTraderProfile('user-1');
      // Fallback should still produce a reasonable score
      expect(result.credit_readiness_score).toBeGreaterThan(0);
      expect(result.credit_readiness_score).toBeLessThanOrEqual(100);
    });
  });
});
