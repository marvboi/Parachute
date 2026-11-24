// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";

/// @dev Destination-chain receiver. Records the alert and emits AlertTriggered.
/// A token sweep or savings transfer can be added later without changing the loop.
contract PriceAlertCallback is AbstractCallback {
    event AlertTriggered(bytes32 indexed asset, uint256 price, uint256 threshold);

    struct LastAlert {
        bytes32 asset;
        uint256 price;
        uint256 threshold;
        uint256 triggeredAt;
    }

    LastAlert public lastAlert;
    uint256 public alertCount;

    constructor(IPayable callbackProxy, address callbackSender)
        payable
        AbstractCallback(callbackProxy, callbackSender)
    {}

    function onAlert(address reactive, bytes32 asset, uint256 price, uint256 threshold)
        external
        onlyServiceProvider
        onlyCallbackSender(reactive)
    {
        lastAlert = LastAlert(asset, price, threshold, block.timestamp);
        alertCount += 1;
        emit AlertTriggered(asset, price, threshold);
    }

    function coverDebt() external {
        _coverDebt();
    }
}
