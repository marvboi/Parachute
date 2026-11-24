// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

/// @dev Stand-in for the Lasna system contract that tracks live subscriptions
/// and queues requested callbacks.
contract SifiMockSystem {
    mapping(bytes32 => uint256) public active;
    uint256 public subscribeCalls;
    uint256 public unsubscribeCalls;

    ISystemContract.CallbackConfiguration_V_1_0[] internal _callbacks;
    bool public light;
    uint256 public lightCount;

    event CallbackRequest(uint256 indexed chainId, address indexed sender, address indexed recipient, bytes configuration);

    /// @dev Light mode only emits, roughly like the real system contract, for gas checks.
    function setLight(bool light_) external {
        light = light_;
    }

    receive() external payable {}

    function debt(address) external pure returns (uint256) {
        return 0;
    }

    function key(uint256 chainId, address target, uint256 t0, uint256 t1, uint256 t2, uint256 t3)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(chainId, target, t0, t1, t2, t3));
    }

    function subscribe(uint256 chainId, address target, uint256 t0, uint256 t1, uint256 t2, uint256 t3) external {
        active[key(chainId, target, t0, t1, t2, t3)] = 1;
        subscribeCalls += 1;
    }

    function unsubscribe(uint256 chainId, address target, uint256 t0, uint256 t1, uint256 t2, uint256 t3) external {
        delete active[key(chainId, target, t0, t1, t2, t3)];
        unsubscribeCalls += 1;
    }

    function requestCallback(ISystemContract.CallbackVersion, bytes memory) external {}

    function requestCallbackV_1_0(ISystemContract.CallbackConfiguration_V_1_0 memory config) external {
        if (light) {
            lightCount += 1;
            emit CallbackRequest(config.chainId, msg.sender, config.recipient, abi.encode(config));
            return;
        }
        _callbacks.push(config);
    }

    function callbackCount() external view returns (uint256) {
        return _callbacks.length;
    }

    function callbackAt(uint256 i) external view returns (ISystemContract.CallbackConfiguration_V_1_0 memory) {
        return _callbacks[i];
    }
}
