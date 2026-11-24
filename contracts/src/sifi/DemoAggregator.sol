// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Owned} from "../Owned.sol";

/// @dev DEMO ONLY. Chainlink-shaped feed the operator can push, so a stop can be
/// shown firing on demand. Emits the same AnswerUpdated event as a real aggregator.
contract DemoAggregator is Owned {
    uint8 public immutable decimals;
    string public description;

    uint80 public latestRound;
    int256 public latestAnswer;
    uint256 public latestTimestamp;

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);

    error BadAnswer();

    constructor(uint8 decimals_, string memory description_) Owned() {
        decimals = decimals_;
        description = string.concat("DEMO ", description_);
    }

    function push(int256 answer) external onlyOwner {
        if (answer <= 0) revert BadAnswer();
        latestRound += 1;
        latestAnswer = answer;
        latestTimestamp = block.timestamp;
        emit AnswerUpdated(answer, latestRound, block.timestamp);
    }

    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80) {
        return (latestRound, latestAnswer, latestTimestamp, latestTimestamp, latestRound);
    }
}
