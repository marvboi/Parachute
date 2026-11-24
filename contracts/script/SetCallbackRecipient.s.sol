// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {PriceAlertReactive} from "../src/PriceAlertReactive.sol";

contract SetCallbackRecipient is Script {
    function run() external {
        PriceAlertReactive reactive = PriceAlertReactive(payable(vm.envAddress("PRICE_ALERT_REACTIVE")));
        address callback = vm.envAddress("PRICE_ALERT_CALLBACK");
        uint64 gasLimit = uint64(vm.envUint("CALLBACK_GAS_LIMIT"));

        vm.startBroadcast();
        reactive.setCallbackRecipient(callback, gasLimit);
        vm.stopBroadcast();

        console.log("callbackRecipient", callback);
        console.log("callbackGasLimit", gasLimit);
    }
}
