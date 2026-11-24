// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {SifiReactive} from "../../src/sifi/SifiReactive.sol";

/// @dev Lasna. Points the watcher at the vault and subscribes to its config events.
contract ConnectParachute is Script {
    function run() external {
        SifiReactive reactive = SifiReactive(payable(vm.envAddress("PARACHUTE_REACTIVE")));
        address vault = vm.envAddress("PARACHUTE_VAULT");
        uint64 gasLimit = uint64(vm.envOr("CALLBACK_GAS_LIMIT", uint256(1_000_000)));

        vm.startBroadcast();
        reactive.setVault(vault, gasLimit);
        vm.stopBroadcast();

        console.log("deployer", msg.sender);
        console.log("watcher", address(reactive), "-> vault", vault);
    }
}
