/**
 * ============================================
 * AgroChain AI — AI Financial Identity Service
 * ============================================
 * Phase 3: AI-powered credit scoring engine.
 *
 * After every completed transaction, aggregates a trader's history
 * and uses OpenAI (or configured LLM) to generate:
 * - Credit Readiness Score (0-100)
 * - Risk indicators with severity
 * - Trade reliability rating
 * - Financing eligibility signal
 *
 * Farmers build real financial identity from actual trade behavior —
 * no traditional credit bureau needed.
 */

import OpenAI from 'openai';
import { config } from '../../config/env';
import { aiRepository } from './ai.repository';
import { buildSystemPrompt, buildAnalysisPrompt } from './ai.prompts';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import {
  FinancialIdentityRow,
  FinancingEligibility,
  RiskIndicator,
} from '../../common/types';
import { generateUUID } from '../../common/utils/crypto';

const logger = createModuleLogger('ai-service');

/** Parsed AI analysis response */
interface AiAnalysisResult {
  creditReadinessScore: number;
  riskIndicators: RiskIndicator[];
  reliabilityRating: number;
  financingEligibility: FinancingEligibility;
  analysisNotes: string;
}

export class AiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }

  /**
   * Analyze a trader's profile and generate/update their financial identity.
   *
   * Full pipeline:
   * 1. Aggregate trading history from Supabase
   * 2. Build structured prompt with trading data
   * 3. Call OpenAI with JSON mode
   * 4. Parse and validate response
   * 5. Upsert financial identity in database
   *
   * @param userId - User to analyze
   * @returns Updated financial identity
   */
  async analyzeTraderProfile(userId: string): Promise<FinancialIdentityRow> {
    logger.info({ userId }, 'Starting AI financial analysis');

    // Step 1: Aggregate trading history
    const traderStats = await aiRepository.getTraderStats(userId);

    if (traderStats.total_trades === 0) {
      logger.info({ userId }, 'No trading history — creating default identity');
      return this.createDefaultIdentity(userId);
    }

    // Step 2: Calculate platform tenure
    const platformTenureMonths = traderStats.firstTradeDate
      ? Math.max(
          1,
          Math.ceil(
            (Date.now() - new Date(traderStats.firstTradeDate).getTime()) /
              (30 * 24 * 60 * 60 * 1000)
          )
        )
      : 0;

    // Step 3: Build prompt and call OpenAI
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildAnalysisPrompt({
      ...traderStats,
      userId,
      platformTenureMonths,
    });

    let analysisResult: AiAnalysisResult;

    try {
      const completion = await this.openai.chat.completions.create({
        model: config.OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: config.OPENAI_MAX_TOKENS,
        temperature: 0.3, // Low temperature for consistent scoring
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      analysisResult = this.parseAiResponse(content);
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error, userId }, 'OpenAI API call failed — using fallback scoring');
      // Fallback: generate a basic score from statistics
      analysisResult = this.generateFallbackScore(traderStats);
    }

    // Step 4: Store results
    const identity = await aiRepository.upsert({
      id: generateUUID(),
      user_id: userId,
      credit_readiness_score: analysisResult.creditReadinessScore,
      risk_indicators: analysisResult.riskIndicators,
      reliability_rating: analysisResult.reliabilityRating,
      financing_eligibility: analysisResult.financingEligibility,
      transaction_history_summary: {
        total_trades: traderStats.total_trades,
        total_volume: traderStats.total_volume,
        avg_order_value: traderStats.avg_order_value,
        on_time_delivery_rate: traderStats.on_time_delivery_rate,
        dispute_rate: traderStats.dispute_rate,
        cancellation_rate: traderStats.cancellation_rate,
        trade_frequency_per_month: traderStats.trade_frequency_per_month,
        months_active: traderStats.months_active,
      },
    });

    logger.info(
      {
        userId,
        score: analysisResult.creditReadinessScore,
        eligibility: analysisResult.financingEligibility,
      },
      'Financial identity analysis complete'
    );

    return identity;
  }

  /**
   * Get a user's financial identity (without re-analyzing).
   */
  async getFinancialIdentity(userId: string): Promise<FinancialIdentityRow> {
    const identity = await aiRepository.findByUserId(userId);
    if (!identity) {
      throw AppError.notFound('Financial identity not found. Complete trades to build your profile.');
    }
    return identity;
  }

  /**
   * Parse and validate the AI response JSON.
   */
  private parseAiResponse(content: string): AiAnalysisResult {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;

      // Validate required fields
      const score = Number(parsed.creditReadinessScore);
      if (isNaN(score) || score < 0 || score > 100) {
        throw new Error('Invalid creditReadinessScore');
      }

      const reliability = Number(parsed.reliabilityRating);
      if (isNaN(reliability) || reliability < 0 || reliability > 100) {
        throw new Error('Invalid reliabilityRating');
      }

      const eligibility = parsed.financingEligibility as string;
      if (!Object.values(FinancingEligibility).includes(eligibility as FinancingEligibility)) {
        throw new Error('Invalid financingEligibility');
      }

      const riskIndicators = Array.isArray(parsed.riskIndicators)
        ? (parsed.riskIndicators as RiskIndicator[]).map((ri) => ({
            indicator: String(ri.indicator),
            severity: ri.severity as 'LOW' | 'MEDIUM' | 'HIGH',
            description: String(ri.description),
          }))
        : [];

      return {
        creditReadinessScore: Math.round(score),
        riskIndicators,
        reliabilityRating: Math.round(reliability),
        financingEligibility: eligibility as FinancingEligibility,
        analysisNotes: String(parsed.analysisNotes ?? ''),
      };
    } catch (error) {
      logger.error({ error, content }, 'Failed to parse AI response');
      throw AppError.internal('Failed to parse AI analysis response');
    }
  }

  /**
   * Fallback scoring when OpenAI is unavailable.
   * Uses simple heuristics based on trade statistics.
   */
  private generateFallbackScore(traderStats: {
    total_trades: number;
    total_volume: number;
    on_time_delivery_rate: number;
    cancellation_rate: number;
    months_active: number;
  }): AiAnalysisResult {
    let score = 30; // Base score

    // Trade volume factor (up to +20)
    if (traderStats.total_trades >= 20) score += 20;
    else if (traderStats.total_trades >= 10) score += 15;
    else if (traderStats.total_trades >= 5) score += 10;
    else score += traderStats.total_trades * 2;

    // On-time delivery (up to +25)
    score += Math.round(traderStats.on_time_delivery_rate * 25);

    // Cancellation penalty (up to -15)
    score -= Math.round(traderStats.cancellation_rate * 15);

    // Tenure bonus (up to +10)
    if (traderStats.months_active >= 12) score += 10;
    else if (traderStats.months_active >= 6) score += 7;
    else if (traderStats.months_active >= 3) score += 4;

    score = Math.max(0, Math.min(100, score));

    const riskIndicators: RiskIndicator[] = [];
    if (traderStats.total_trades < 5) {
      riskIndicators.push({
        indicator: 'Limited trade history',
        severity: 'MEDIUM',
        description: `Only ${traderStats.total_trades} trades recorded`,
      });
    }
    if (traderStats.cancellation_rate > 0.2) {
      riskIndicators.push({
        indicator: 'High cancellation rate',
        severity: 'HIGH',
        description: `${(traderStats.cancellation_rate * 100).toFixed(0)}% cancellation rate`,
      });
    }

    let eligibility: FinancingEligibility;
    if (score >= 65 && !riskIndicators.some((r) => r.severity === 'HIGH')) {
      eligibility = FinancingEligibility.ELIGIBLE;
    } else if (score >= 40) {
      eligibility = FinancingEligibility.NEEDS_MORE_DATA;
    } else {
      eligibility = FinancingEligibility.HIGH_RISK;
    }

    return {
      creditReadinessScore: score,
      riskIndicators,
      reliabilityRating: Math.round(traderStats.on_time_delivery_rate * 100),
      financingEligibility: eligibility,
      analysisNotes: 'Fallback analysis — AI service unavailable',
    };
  }

  /**
   * Create a default identity for users with no trades.
   */
  private async createDefaultIdentity(userId: string): Promise<FinancialIdentityRow> {
    return aiRepository.upsert({
      id: generateUUID(),
      user_id: userId,
      credit_readiness_score: 0,
      risk_indicators: [
        {
          indicator: 'No trade history',
          severity: 'MEDIUM',
          description: 'User has not completed any trades on the platform',
        },
      ],
      reliability_rating: 0,
      financing_eligibility: FinancingEligibility.NEEDS_MORE_DATA,
      transaction_history_summary: {
        total_trades: 0,
        total_volume: 0,
        avg_order_value: 0,
        on_time_delivery_rate: 0,
        dispute_rate: 0,
        cancellation_rate: 0,
        trade_frequency_per_month: 0,
        months_active: 0,
      },
    });
  }
}

/** Singleton instance */
export const aiService = new AiService();
