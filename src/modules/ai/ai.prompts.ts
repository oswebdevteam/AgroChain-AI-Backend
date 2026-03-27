/**
 * ============================================
 * AgroChain AI — AI Prompt Templates
 * ============================================
 * Structured prompts for the AI Financial Identity Engine.
 * These prompts explain the Nigerian agricultural context, scoring criteria,
 * and expected JSON output format to the LLM.
 */

import { TransactionHistorySummary } from '../../common/types';

/**
 * Build the system prompt for credit analysis.
 * Sets the context and scoring rubric for the LLM.
 */
export function buildSystemPrompt(): string {
  return `You are a financial analyst for AgroChain AI, a platform that builds financial identities for agricultural traders in Nigeria and emerging markets. These traders typically lack traditional credit bureau records.

Your role is to analyze a trader's transaction history on the platform and generate:
1. A Credit Readiness Score (0-100)
2. Risk indicators with severity levels
3. A trade reliability rating (0-100)
4. A financing eligibility signal

SCORING RUBRIC:

Credit Readiness Score (0-100):
- 80-100: Excellent. Consistent high-volume trading, zero disputes, long platform tenure.
- 60-79: Good. Regular trading activity, few disputes, growing volumes.
- 40-59: Fair. Some activity but inconsistent, minor disputes.
- 20-39: Developing. Limited history, some red flags.
- 0-19: Insufficient. Too little data or significant risk factors.

Key Factors (weighted):
- Trade frequency and consistency (25%)
- On-time delivery/payment rate (25%)
- Transaction volume and growth trend (20%)
- Dispute/cancellation rate — inverse (15%)
- Platform tenure (15%)

Risk Indicators:
- Each indicator must have: indicator (short name), severity (LOW/MEDIUM/HIGH), description
- Examples: "Low trade volume", "High cancellation rate", "Short platform history"

Financing Eligibility:
- ELIGIBLE: Score >= 65, no HIGH severity risks, at least 5 completed trades
- NEEDS_MORE_DATA: Score 40-64 or fewer than 5 completed trades
- HIGH_RISK: Score < 40 or any critical risk indicators

IMPORTANT: You must return ONLY valid JSON matching the exact schema below. No markdown, no explanation, just the JSON object.`;
}

/**
 * Build the user prompt with the trader's actual data.
 *
 * @param traderData - Aggregated transaction history
 * @returns User prompt string with embedded data
 */
export function buildAnalysisPrompt(traderData: TransactionHistorySummary & {
  userId: string;
  role: string;
  platformTenureMonths: number;
}): string {
  return `Analyze the following trader's platform activity and generate their financial identity score.

TRADER PROFILE:
- User ID: ${traderData.userId}
- Role: ${traderData.role}
- Platform Tenure: ${traderData.platformTenureMonths} months

TRANSACTION HISTORY:
- Total Trades: ${traderData.total_trades}
- Completed Trades: ${traderData.total_trades - Math.round(traderData.total_trades * traderData.cancellation_rate)}
- Total Volume (NGN): ${traderData.total_volume.toLocaleString()}
- Average Order Value (NGN): ${traderData.avg_order_value.toLocaleString()}
- On-Time Delivery Rate: ${(traderData.on_time_delivery_rate * 100).toFixed(1)}%
- Dispute Rate: ${(traderData.dispute_rate * 100).toFixed(1)}%
- Cancellation Rate: ${(traderData.cancellation_rate * 100).toFixed(1)}%
- Trade Frequency: ${traderData.trade_frequency_per_month.toFixed(1)} trades/month
- Months Active: ${traderData.months_active}

Return your analysis as the following JSON schema:
{
  "creditReadinessScore": <number 0-100>,
  "riskIndicators": [
    {
      "indicator": "<string>",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "description": "<string>"
    }
  ],
  "reliabilityRating": <number 0-100>,
  "financingEligibility": "ELIGIBLE" | "NEEDS_MORE_DATA" | "HIGH_RISK",
  "analysisNotes": "<brief 1-2 sentence summary>"
}`;
}
