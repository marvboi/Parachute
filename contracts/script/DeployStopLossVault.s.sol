// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {StopLossVault} from "../src/StopLossVault.sol";

contract DeployStopLossVault is Script {
    function run() external {
        address proxy = vm.envAddress("CALLBACK_PROXY");
        address reactive = vm.envAddress("STOP_LOSS_REACTIVE");
        address token = vm.envAddress("STOP_LOSS_TOKEN");

        vm.startBroadcast();
        StopLossVault vault = new StopLossVault(
            IPayable(payable(proxy)),
            reactive,
            token
        );
        vm.stopBroadcast();

        console.log("StopLossVault", address(vault));
    }
}
