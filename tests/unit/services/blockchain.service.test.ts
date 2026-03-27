/**
 * ============================================
 * AgroChain AI — Blockchain Service Unit Tests
 * ============================================
 */

import { BlockchainService } from '../../../src/modules/blockchain/blockchain.service';
import { blockchainRepository } from '../../../src/modules/blockchain/blockchain.repository';
import { escrowRepository } from '../../../src/modules/escrow/escrow.repository';
import { BlockchainEventType } from '../../../src/common/types';
import { createTestBlockchainLog, createTestEscrow } from '../../helpers/testData';

jest.mock('../../../src/modules/blockchain/blockchain.repository');
jest.mock('../../../src/modules/escrow/escrow.repository');
jest.mock('../../../src/config/env', () => ({
  config: {
    BASE_SEPOLIA_RPC_URL: 'https://sepolia.base.org',
    BLOCKCHAIN_PRIVATE_KEY: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    TRADE_LOGGER_CONTRACT_ADDRESS: '0x',
    BASE_SEPOLIA_CHAIN_ID: 84532,
  },
}));
jest.mock('../../../src/config/logger', () => ({
  createModuleLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock ethers
jest.mock('ethers', () => {
  const mockReceipt = {
    hash: '0xabcdef1234567890',
    blockNumber: 12345678,
    status: 1,
  };
  const mockTx = {
    hash: '0xabcdef1234567890',
    wait: jest.fn().mockResolvedValue(mockReceipt),
  };
  return {
    ethers: {
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBalance: jest.fn().mockResolvedValue(BigInt('500000000000000000')),
      })),
      Wallet: jest.fn().mockImplementation(() => ({
        address: '0xWalletAddress',
        sendTransaction: jest.fn().mockResolvedValue(mockTx),
      })),
      Contract: jest.fn(),
      AbiCoder: jest.fn().mockImplementation(() => ({
        encode: jest.fn().mockReturnValue('0xencoded'),
      })),
      formatEther: jest.fn().mockReturnValue('0.5'),
      zeroPadValue: jest.fn().mockReturnValue('0x' + '0'.repeat(64)),
      toBeHex: jest.fn().mockReturnValue('0x0'),
    },
  };
});

describe('BlockchainService', () => {
  let service: BlockchainService;

  beforeEach(() => {
    service = new BlockchainService();
    jest.clearAllMocks();
  });

  describe('recordTradeOnChain', () => {
    it('should skip if already recorded (idempotency)', async () => {
      const existingLog = createTestBlockchainLog({ order_id: 'order-1' });

      (blockchainRepository.existsForOrder as jest.Mock).mockResolvedValue(true);
      (blockchainRepository.findByOrderId as jest.Mock).mockResolvedValue([existingLog]);

      const result = await service.recordTradeOnChain('order-1', {
        escrowState: 'RELEASED',
        amount: 50000,
        paymentReference: 'REF-001',
      });

      expect(result.txHash).toBe(existingLog.tx_hash);
    });

    it('should record trade and return BaseScan URL', async () => {
      (blockchainRepository.existsForOrder as jest.Mock).mockResolvedValue(false);
      (blockchainRepository.create as jest.Mock).mockResolvedValue({});
      (escrowRepository.findByOrderId as jest.Mock).mockResolvedValue(createTestEscrow());
      (escrowRepository.update as jest.Mock).mockResolvedValue({});

      const result = await service.recordTradeOnChain('order-1', {
        escrowState: 'RELEASED',
        amount: 50000,
        paymentReference: 'REF-001',
      });

      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeDefined();
      expect(result.baseScanUrl).toContain('sepolia.basescan.org');
      expect(blockchainRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getBlockchainProof', () => {
    it('should return proof with events', async () => {
      const logs = [
        createTestBlockchainLog({ order_id: 'order-1' }),
      ];
      (blockchainRepository.findByOrderId as jest.Mock).mockResolvedValue(logs);

      const result = await service.getBlockchainProof('order-1');
      expect(result.orderId).toBe('order-1');
      expect(result.events).toHaveLength(1);
      expect(result.verified).toBe(true);
    });

    it('should throw 404 if no logs found', async () => {
      (blockchainRepository.findByOrderId as jest.Mock).mockResolvedValue([]);

      await expect(service.getBlockchainProof('order-1')).rejects.toThrow('not found');
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet address and balance', async () => {
      const result = await service.getWalletBalance();
      expect(result.address).toBeDefined();
      expect(result.balanceEth).toBe('0.5');
    });
  });
});
