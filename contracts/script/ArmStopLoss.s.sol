// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {StopLossVault} from "../src/StopLossVault.sol";
import {StopLossReactive} from "../src/StopLossReactive.sol";

contract ArmStopLossVault is Script {
    function run() external {
        StopLossVault vault = StopLossVault(payable(vm.envAddress("STOP_LOSS_VAULT")));
        uint256 stopPrice = vm.envUint("STOP_PRICE");
        address safe = vm.envAddress("STOP_LOSS_SAFE");
        uint256 minOriginBlock = vm.envOr("STOP_MIN_ORIGIN_BLOCK", uint256(0));
        address stable = vm.envOr("STOP_LOSS_STABLE", address(0));
        address swapRouter = vm.envOr("STOP_LOSS_SWAP", address(0));

        vm.startBroadcast();
        uint256 armId = vault.arm(stopPrice, safe, minOriginBlock, stable, swapRouter);
        vm.stopBroadcast();

        console.log("vaultArmId", armId);
        console.log("copy this into STOP_ARM_ID before arming the reactive contract");
    }
}

contract ArmStopLossReactive is Script {
    function run() external {
        StopLossReactive reactive = StopLossReactive(payable(vm.envAddress("STOP_LOSS_REACTIVE")));
        uint256 armId = vm.envUint("STOP_ARM_ID");
        uint256 stopPrice = vm.envUint("STOP_PRICE");
        uint256 minOriginBlock = vm.envOr("STOP_MIN_ORIGIN_BLOCK", uint256(0));

        vm.startBroadcast();
        reactive.arm(armId, stopPrice, minOriginBlock);
        vm.stopBroadcast();

        console.log("reactiveArmId", armId);
        console.log("stopPrice", stopPrice);
    }
}
