// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {PriceAlertCallback} from "../src/PriceAlertCallback.sol";

contract DeployPriceAlertCallback is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        address reactive = vm.envAddress("PRICE_ALERT_REACTIVE");

        vm.startBroadcast();
        PriceAlertCallback callback = new PriceAlertCallback(
            IPayable(payable(proxy)),
            reactive
        );
        vm.stopBroadcast();

        console.log("PriceAlertCallback", address(callback));
    }
}
