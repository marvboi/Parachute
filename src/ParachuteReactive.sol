// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { AbstractReactive } from "reactive/base/AbstractReactive.sol";
import { IReactive } from "reactive/interfaces/IReactive.sol";
import { ISystemContract } from "reactive/interfaces/ISystemContract.sol";
import { IParachuteVault } from "./interfaces/IParachuteVault.sol";

/// @title Watches Chainlink AnswerUpdated on Base Sepolia and callbacks the vault.
contract ParachuteReactive is AbstractReactive {
    uint256 public constant ORIGIN_CHAIN_ID = 84532;
    uint256 public constant ANSWER_UPDATED = 0x0559884fd3a460db3073b7fc896cc77986f16e378210ded43186175bf646fc5f;

    address public vault;
    uint64 public callbackGasLimit;

    mapping(address => bool) public monitoredFeeds;

    event PriceObserved(address feed, int256 answer, uint256 updatedAt);
    event CallbackRequested(address feed, int256 answer);

    error VaultNotSet();
    error FeedNotMonitored();

    constructor() AbstractReactive() {}

    function configure(address vault_, uint64 gasLimit_, address[] calldata feeds) external {
        vault = vault_;
        callbackGasLimit = gasLimit_;

        for (uint256 i = 0; i < feeds.length; i++) {
            monitoredFeeds[feeds[i]] = true;
            SYSTEM.subscribe(ORIGIN_CHAIN_ID, feeds[i], ANSWER_UPDATED, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        }
    }

    function react(IReactive.LogRecord calldata log_) external onlySystem override {
        if (log_.chainId != ORIGIN_CHAIN_ID) return;

        address feed = log_.contractAddress;
        if (!monitoredFeeds[feed]) revert FeedNotMonitored();

        int256 answer = int256(uint256(log_.topic1));
        uint256 updatedAt = abi.decode(log_.data, (uint256));

        emit PriceObserved(feed, answer, updatedAt);

        if (vault == address(0)) revert VaultNotSet();

        bytes memory payload = abi.encodeWithSelector(
            IParachuteVault.onPriceUpdate.selector, feed, answer, updatedAt
        );

        ISystemContract.CallbackConfiguration_V_1_0 memory cfg = ISystemContract.CallbackConfiguration_V_1_0({
            chainId: ORIGIN_CHAIN_ID,
            recipient: vault,
            gasLimit: callbackGasLimit,
            payload: abi.encodePacked(address(this), payload)
        });

        SYSTEM.requestCallbackV_1_0(cfg);
        emit CallbackRequested(feed, answer);
    }
}