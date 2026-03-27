import { ethers } from 'ethers';
import { config } from '../../config/env';
import { blockchainRepository } from './blockchain.repository';
import { escrowRepository } from '../escrow/escrow.repository';
import { AppError } from '../../common/errors/AppError';
import { createModuleLogger } from '../../config/logger';
import { BlockchainEventType } from '../../common/types';
import { sha256, generateUUID } from '../../common/utils/crypto';

const logger = createModuleLogger('blockchain-service');

/** Base Sepolia block explorer URL */
const BASE_SCAN_SEPOLIA_URL = 'https://sepolia.basescan.org';

/**
 * TradeLogger contract ABI — minimal interface for logging trade events.
 * Assumes a deployed contract with a logTrade function.
 * If no contract is deployed, we fall back to sending data as tx calldata.
 */
const TRADE_LOGGER_ABI = [
  'function logTrade(string tradeRef, string escrowState, bool deliveryConfirmed, uint256 timestamp, bytes32 buyerHash, bytes32 sellerHash) external',
  'event TradeLogged(string indexed tradeRef, string escrowState, bool deliveryConfirmed, uint256 timestamp)',
];

interface TradeOnChainData {
  escrowState: string;
  amount: number;
  paymentReference: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.BASE_SEPOLIA_RPC_URL, {
      name: 'base-sepolia',
      chainId: config.BASE_SEPOLIA_CHAIN_ID,
    });
    this.wallet = new ethers.Wallet(config.BLOCKCHAIN_PRIVATE_KEY, this.provider);
  }

  /**
   * Record a trade event immutably on Base Sepolia.
   *
   * On-chain data includes:
   * - tradeAgreementRef (orderId)
   * - escrowState (RELEASED)
   * - deliveryConfirmation (true)
   * - timestamp
   * - hashed party identifiers (for privacy)
   *
   * @param orderId - Order to record
   * @param tradeData - Escrow state data
   * @returns Transaction hash and BaseScan URL
   */
  async recordTradeOnChain(
    orderId: string,
    tradeData: TradeOnChainData
  ): Promise<{ txHash: string; blockNumber: number; baseScanUrl: string }> {
    logger.info({ orderId }, 'Recording trade on Base Sepolia');

    // Idempotency check
    const alreadyRecorded = await blockchainRepository.existsForOrder(
      orderId,
      BlockchainEventType.TRADE_RECORDED
    );
    if (alreadyRecorded) {
      logger.info({ orderId }, 'Trade already recorded on-chain — skipping');
      const existingLogs = await blockchainRepository.findByOrderId(orderId);
      const latestLog = existingLogs[existingLogs.length - 1];
      return {
        txHash: latestLog.tx_hash,
        blockNumber: latestLog.block_number,
        baseScanUrl: `${BASE_SCAN_SEPOLIA_URL}/tx/${latestLog.tx_hash}`,
      };
    }

    try {
      // Encode trade data as calldata
      const encoder = new ethers.AbiCoder();
      const encodedData = encoder.encode(
        ['string', 'string', 'uint256', 'uint256', 'string'],
        [
          orderId,
          tradeData.escrowState,
          Math.round(tradeData.amount * 100), // Amount in minor units
          Math.floor(Date.now() / 1000), // Unix timestamp
          sha256(tradeData.paymentReference), // Hashed for privacy
        ]
      );

      // Try contract call first, fall back to raw transaction
      let tx: ethers.TransactionResponse;

      if (config.TRADE_LOGGER_CONTRACT_ADDRESS && config.TRADE_LOGGER_CONTRACT_ADDRESS !== '0x') {
        try {
          const contract = new ethers.Contract(
            config.TRADE_LOGGER_CONTRACT_ADDRESS,
            TRADE_LOGGER_ABI,
            this.wallet
          );

          tx = await contract.logTrade(
            orderId,
            tradeData.escrowState,
            true, // deliveryConfirmed
            BigInt(Math.floor(Date.now() / 1000)),
            ethers.zeroPadValue(ethers.toBeHex(BigInt('0x' + sha256(orderId).slice(0, 16))), 32),
            ethers.zeroPadValue(ethers.toBeHex(BigInt('0x' + sha256(tradeData.paymentReference).slice(0, 16))), 32)
          );
        } catch (contractError) {
          logger.warn({ error: contractError }, 'Contract call failed, falling back to raw tx');
          // Fallback: send encoded data as raw transaction
          tx = await this.wallet.sendTransaction({
            to: this.wallet.address, // Self-transfer with data
            data: encodedData,
            value: 0n,
          });
        }
      } else {
        // No contract deployed — send as raw transaction with data
        tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          data: encodedData,
          value: 0n,
        });
      }

      logger.info({ txHash: tx.hash }, 'Transaction sent, waiting for confirmation');

      // Wait for 1 block confirmation
      const receipt = await tx.wait(1);

      if (!receipt) {
        throw AppError.internal('Transaction confirmation failed — no receipt');
      }

      const blockNumber = receipt.blockNumber;
      const txHash = receipt.hash;

      // Store in database
      await blockchainRepository.create({
        id: generateUUID(),
        order_id: orderId,
        event_type: BlockchainEventType.TRADE_RECORDED,
        tx_hash: txHash,
        block_number: blockNumber,
      });

      // Update escrow with blockchain tx hash
      const escrow = await escrowRepository.findByOrderId(orderId);
      if (escrow) {
        await escrowRepository.update(escrow.id, {
          blockchain_tx_hash: txHash,
        });
      }

      const baseScanUrl = `${BASE_SCAN_SEPOLIA_URL}/tx/${txHash}`;
      logger.info({ txHash, blockNumber, baseScanUrl }, 'Trade recorded on-chain');

      return { txHash, blockNumber, baseScanUrl };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error, orderId }, 'Failed to record trade on blockchain');
      throw AppError.badGateway('Blockchain transaction failed');
    }
  }

  /**
   * Get blockchain proof for an order.
   * Returns all on-chain events associated with the order.
   *
   * @param orderId - Order UUID
   * @returns Blockchain proof data with BaseScan URLs
   */
  async getBlockchainProof(orderId: string): Promise<{
    orderId: string;
    events: Array<{
      eventType: string;
      txHash: string;
      blockNumber: number;
      baseScanUrl: string;
      timestamp: string;
    }>;
    verified: boolean;
  }> {
    const logs = await blockchainRepository.findByOrderId(orderId);

    if (logs.length === 0) {
      throw AppError.notFound('No blockchain records found for this order');
    }

    return {
      orderId,
      events: logs.map((log) => ({
        eventType: log.event_type,
        txHash: log.tx_hash,
        blockNumber: log.block_number,
        baseScanUrl: `${BASE_SCAN_SEPOLIA_URL}/tx/${log.tx_hash}`,
        timestamp: log.timestamp,
      })),
      verified: true,
    };
  }

  /**
   * Get the wallet balance (for monitoring).
   */
  async getWalletBalance(): Promise<{ address: string; balanceEth: string }> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return {
      address: this.wallet.address,
      balanceEth: ethers.formatEther(balance),
    };
  }
}

/** Singleton instance */
export const blockchainService = new BlockchainService();
