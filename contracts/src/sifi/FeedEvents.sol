// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

/// @dev Event layouts shared by the vault (emitter) and the reactive watcher (decoder).
library FeedEvents {
    /// Chainlink OCR aggregator: AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt)
    uint256 internal constant ANSWER_UPDATED = uint256(keccak256("AnswerUpdated(int256,uint256,uint256)"));

    /// SifiVault: PositionArmed(uint256 indexed id, uint64 indexed nonce, address indexed feed, uint8 mode,
    /// uint256 stopPrice, uint16 trailBps, uint256 anchorPrice, uint64 armedAt)
    uint256 internal constant POSITION_ARMED =
        uint256(keccak256("PositionArmed(uint256,uint64,address,uint8,uint256,uint16,uint256,uint64)"));

    /// SifiVault: PositionDisarmed(uint256 indexed id, uint64 indexed nonce)
    uint256 internal constant POSITION_DISARMED = uint256(keccak256("PositionDisarmed(uint256,uint64)"));

    uint8 internal constant MODE_FIXED = 1;
    uint8 internal constant MODE_TRAILING = 2;
}
