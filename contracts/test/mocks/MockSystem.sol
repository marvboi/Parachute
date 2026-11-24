// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

/// @dev Local stand-in for the Lasna system contract at 0x8888...8888.
contract MockSystem {
    struct Subscription {
        uint256 chainId;
        address contractAddress;
        uint256 topic0;
        uint256 topic1;
        uint256 topic2;
        uint256 topic3;
    }

    Subscription public lastSubscribe;
    uint256 public subscribeCount;

    ISystemContract.CallbackConfiguration_V_1_0 public lastCallback;
    uint256 public callbackCount;

    receive() external payable {}

    function debt(address) external pure returns (uint256) {
        return 0;
    }

    function subscribe(
        uint256 chainId,
        address contractAddress,
        uint256 topic0,
        uint256 topic1,
        uint256 topic2,
        uint256 topic3
    ) external {
        lastSubscribe = Subscription(chainId, contractAddress, topic0, topic1, topic2, topic3);
        subscribeCount += 1;
    }

    function unsubscribe(uint256, address, uint256, uint256, uint256, uint256) external {}

    function requestCallback(ISystemContract.CallbackVersion, bytes memory) external {}

    function requestCallbackV_1_0(ISystemContract.CallbackConfiguration_V_1_0 memory config) external {
        lastCallback = config;
        callbackCount += 1;
    }
}
