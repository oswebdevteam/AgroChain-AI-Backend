// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TradeLogger
 * @dev Records immutable trade events for the AgroChain AI platform.
 * This contract acts as the on-chain evidentiary record for multi-party trade agreements.
 */
contract TradeLogger is Ownable {
    
    event TradeLogged(
        string indexed tradeRef,
        string escrowState,
        bool deliveryConfirmed,
        uint256 timestamp
    );

    /**
     * @dev Constructor sets the deployer as the initial owner.
     * The owner should be the AgroChain backend wallet.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @dev Records a trade event on-chain.
     * @param tradeRef The unique identifier for the trade (e.g., Order UUID).
     * @param escrowState The status of the escrow (e.g., "HELD", "RELEASED").
     * @param deliveryConfirmed Boolean indicating if delivery was verified.
     * @param timestamp The block timestamp or provided Unix timestamp.
     * @param buyerHash Keccak256 hash of buyer identification (for privacy).
     * @param sellerHash Keccak256 hash of seller identification (for privacy).
     */
    function logTrade(
        string memory tradeRef,
        string memory escrowState,
        bool deliveryConfirmed,
        uint256 timestamp,
        bytes32 buyerHash,
        bytes32 sellerHash
    ) external onlyOwner {
        require(bytes(tradeRef).length > 0, "Trade reference required");
        
        emit TradeLogged(
            tradeRef,
            escrowState,
            deliveryConfirmed,
            timestamp
        );
        
        // Note: buyerHash and sellerHash are included in the calldata and 
        // stored immutably in the transaction logs even if not emitted in the event.
        // This optimizes gas while maintaining the audit trail.
    }
}
