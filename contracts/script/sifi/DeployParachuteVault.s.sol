// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {Script, console} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {ParachuteConstants} from "../../src/sifi/ParachuteConstants.sol";

/// @dev Destination chain. The vault trusts only CALLBACK_PROXY and PARACHUTE_REACTIVE,
/// both fixed at deploy. A wrong reactive address means redeploying.
contract DeployParachuteVault is Script {
    function run() external returns (SifiVault vault) {
        address proxy = vm.envOr("CALLBACK_PROXY", ParachuteConstants.CALLBACK_PROXY);
        require(proxy == ParachuteConstants.CALLBACK_PROXY, "unexpected callback proxy");
        address reactive = vm.envAddress("PARACHUTE_REACTIVE");
        uint256 funding = vm.envOr("VAULT_FUNDING", uint256(0.01 ether));

        vm.startBroadcast();
        vault = new SifiVault{value: funding}(IPayable(payable(proxy)), reactive);
        vm.stopBroadcast();

        console.log("PARACHUTE_VAULT", address(vault));
        console.log("owner", vault.owner());
    }
}
