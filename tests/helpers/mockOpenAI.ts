/**
 * ============================================
 * AgroChain AI — OpenAI Mock Helpers
 * ============================================
 */

export const mockCreditAnalysisResponse = {
  creditReadinessScore: 72,
  riskIndicators: [
    {
      indicator: 'Limited trade history',
      severity: 'LOW',
      description: 'Trader has completed fewer than 10 trades',
    },
    {
      indicator: 'Growing volume',
      severity: 'LOW',
      description: 'Trade volume shows positive growth trend',
    },
  ],
  reliabilityRating: 85,
  financingEligibility: 'ELIGIBLE',
  analysisNotes: 'Trader shows consistent activity with good delivery rates.',
};

export const mockOpenAICompletion = {
  id: 'chatcmpl-test-123',
  object: 'chat.completion',
  created: Date.now(),
  model: 'gpt-4o',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify(mockCreditAnalysisResponse),
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 200,
    total_tokens: 700,
  },
};

/**
 * Create a mock OpenAI client.
 */
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockOpenAICompletion),
      },
    },
  };
}
