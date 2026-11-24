// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {Owned} from "./Owned.sol";

/// @dev Lasna-side watcher. Subscribes to PriceReported and requests a callback
/// when the price crosses the configured threshold.
contract PriceAlertReactive is AbstractReactive, Owned {
    uint256 internal constant PRICE_REPORTED_TOPIC0 =
        uint256(keccak256("PriceReported(bytes32,uint256)"));

    uint256 public immutable originChainId;
    address public immutable originContract;
    uint256 public immutable destinationChainId;

    // bytes32(0) means any asset from the origin contract
    bytes32 public watchedAsset;
    uint256 public threshold;
    bool public above;
    bool public armed;
    address public callbackRecipient;
    uint64 public callbackGasLimit;

    event ThresholdUpdated(bytes32 watchedAsset, uint256 threshold, bool above);
    event CallbackRecipientSet(address recipient, uint64 gasLimit);
    event AlertRequested(bytes32 asset, uint256 price, uint256 threshold);
    event Rearmed();

    constructor(
        uint256 originChainId_,
        address originContract_,
        uint256 destinationChainId_,
        bytes32 watchedAsset_,
        uint256 threshold_,
        bool above_
    ) payable Owned() {
        if (originContract_ == address(0)) revert ZeroAddress();

        originChainId = originChainId_;
        originContract = originContract_;
        destinationChainId = destinationChainId_;
        watchedAsset = watchedAsset_;
        threshold = threshold_;
        above = above_;
        armed = true;
        callbackGasLimit = 1_000_000;

        SYSTEM.subscribe(
            originChainId_,
            originContract_,
            PRICE_REPORTED_TOPIC0,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE,
            REACTIVE_IGNORE
        );
    }

    /// @inheritdoc IReactive
    function react(IReactive.LogRecord memory log_) external onlySystem {
        if (!armed || callbackRecipient == address(0)) return;
        if (log_.chainId != originChainId || log_.contractAddress != originContract) return;
        if (log_.topic0 != PRICE_REPORTED_TOPIC0 || log_.opCode != 2) return;

        bytes32 asset = bytes32(log_.topic1);
        if (watchedAsset != bytes32(0) && asset != watchedAsset) return;

        uint256 price = abi.decode(log_.data, (uint256));
        // Equality counts as a crossing.
        bool crossed = above ? price >= threshold : price <= threshold;
        if (!crossed) return;

        armed = false;
        emit AlertRequested(asset, price, threshold);

        bytes memory payload = abi.encodeWithSignature(
            "onAlert(address,bytes32,uint256,uint256)",
            address(0),
            asset,
            price,
            threshold
        );

        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: destinationChainId,
                recipient: callbackRecipient,
                gasLimit: callbackGasLimit,
                payload: payload
            })
        );
    }

    function setCallbackRecipient(address recipient, uint64 gasLimit) external onlyOwner {
        if (recipient == address(0)) revert ZeroAddress();
        if (gasLimit < 100_000) revert GasLimitTooLow();
        callbackRecipient = recipient;
        callbackGasLimit = gasLimit;
        emit CallbackRecipientSet(recipient, gasLimit);
    }

    function setThreshold(bytes32 watchedAsset_, uint256 threshold_, bool above_) external onlyOwner {
        watchedAsset = watchedAsset_;
        threshold = threshold_;
        above = above_;
        emit ThresholdUpdated(watchedAsset_, threshold_, above_);
    }

    function rearm() external onlyOwner {
        armed = true;
        emit Rearmed();
    }

    function coverDebt() external {
        _coverDebt();
    }

    error GasLimitTooLow();
}
