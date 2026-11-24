// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {StopLossReactive} from "../src/StopLossReactive.sol";

contract SetStopLossRecipient is Script {
    function run() external {
        StopLossReactive reactive = StopLossReactive(payable(vm.envAddress("STOP_LOSS_REACTIVE")));
        address vault = vm.envAddress("STOP_LOSS_VAULT");
        uint64 gasLimit = uint64(vm.envUint("CALLBACK_GAS_LIMIT"));

        vm.startBroadcast();
        reactive.setCallbackRecipient(vault, gasLimit);
        vm.stopBroadcast();

        console.log("callbackRecipient", vault);
        console.log("callbackGasLimit", gasLimit);
    }
}
