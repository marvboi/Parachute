// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {Owned} from "./Owned.sol";

/// @dev Lasna-side watcher. Fires once per arm when the origin price is at or below the stop.
contract StopLossReactive is AbstractReactive, Owned {
    uint256 internal constant PRICE_REPORTED_TOPIC0 =
        uint256(keccak256("PriceReported(bytes32,uint256)"));

    uint256 public immutable originChainId;
    address public immutable originContract;
    uint256 public immutable destinationChainId;

    bytes32 public watchedAsset;
    uint256 public stopPrice;
    uint256 public armId;
    uint256 public minOriginBlock;
    uint256 public lastSeenOriginBlock;
    bool public armed;
    address public callbackRecipient;
    uint64 public callbackGasLimit;

    event CallbackRecipientSet(address recipient, uint64 gasLimit);
    event Armed(uint256 armId, uint256 stopPrice, uint256 minOriginBlock);
    event Cancelled(uint256 armId);
    event StopRequested(bytes32 asset, uint256 price, uint256 stopPrice, uint256 armId, uint256 originBlock);

    error GasLimitTooLow();
    error InvalidStop();
    error NotArmed();

    constructor(
        uint256 originChainId_,
        address originContract_,
        uint256 destinationChainId_,
        bytes32 watchedAsset_
    ) payable Owned() {
        if (originContract_ == address(0)) revert ZeroAddress();

        originChainId = originChainId_;
        originContract = originContract_;
        destinationChainId = destinationChainId_;
        watchedAsset = watchedAsset_;
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
        if (log_.blockNumber < minOriginBlock || log_.blockNumber <= lastSeenOriginBlock) return;

        bytes32 asset = bytes32(log_.topic1);
        if (watchedAsset != bytes32(0) && asset != watchedAsset) return;

        uint256 price = abi.decode(log_.data, (uint256));
        // Record the block even when the price is above the stop, so an older
        // log arriving later cannot fire after a newer one has been seen.
        lastSeenOriginBlock = log_.blockNumber;
        if (price > stopPrice) return;

        armed = false;
        emit StopRequested(asset, price, stopPrice, armId, log_.blockNumber);

        bytes memory payload = abi.encodeWithSignature(
            "executeStopLoss(address,uint256,uint256,uint256)",
            address(0),
            armId,
            log_.blockNumber,
            price
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

    function arm(uint256 armId_, uint256 stopPrice_, uint256 minOriginBlock_) external onlyOwner {
        if (armId_ == 0 || stopPrice_ == 0) revert InvalidStop();
        armId = armId_;
        stopPrice = stopPrice_;
        minOriginBlock = minOriginBlock_;
        lastSeenOriginBlock = 0;
        armed = true;
        emit Armed(armId_, stopPrice_, minOriginBlock_);
    }

    function cancel() external onlyOwner {
        if (!armed) revert NotArmed();
        armed = false;
        emit Cancelled(armId);
    }

    function coverDebt() external {
        _coverDebt();
    }
}
