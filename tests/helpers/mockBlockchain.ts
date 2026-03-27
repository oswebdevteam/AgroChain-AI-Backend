/**
 * ============================================
 * AgroChain AI — Blockchain Mock Helpers
 * ============================================
 */

export const mockTransactionResponse = {
  hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  wait: jest.fn().mockResolvedValue({
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 12345678,
    status: 1,
  }),
};

export const mockWalletBalance = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  balanceEth: '0.5',
};

/**
 * Create a mock ethers provider and wallet.
 */
export function createMockEthersProvider() {
  return {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(BigInt('500000000000000000')), // 0.5 ETH
      getNetwork: jest.fn().mockResolvedValue({ name: 'base-sepolia', chainId: 84532n }),
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      sendTransaction: jest.fn().mockResolvedValue(mockTransactionResponse),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      logTrade: jest.fn().mockResolvedValue(mockTransactionResponse),
    })),
    AbiCoder: jest.fn().mockImplementation(() => ({
      encode: jest.fn().mockReturnValue('0xencoded'),
    })),
    formatEther: jest.fn().mockReturnValue('0.5'),
    zeroPadValue: jest.fn().mockReturnValue('0x' + '0'.repeat(64)),
    toBeHex: jest.fn().mockReturnValue('0x0'),
  };
}
