// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { Script } from "forge-std/Script.sol";
import { ParachuteVault } from "../src/ParachuteVault.sol";
import { ParachuteReactive } from "../src/ParachuteReactive.sol";

/// @notice Deployment skeleton — requires live keys off-repo.
contract DeployParachute is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        ParachuteReactive reactive = new ParachuteReactive();
        ParachuteVault vault = new ParachuteVault(address(reactive), deployer);

        address[3] memory feeds = [
            0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3,
            0x961AD289351459A45fC90884eF3AB0278ea95DDE,
            0xAc6DB6d5538Cd07f58afee9dA736ce192119017B
        ];

        address[] memory list = new address[](3);
        for (uint256 i = 0; i < 3; i++) list[i] = feeds[i];

        reactive.configure(address(vault), 500_000, list);

        vm.stopBroadcast();
    }
}