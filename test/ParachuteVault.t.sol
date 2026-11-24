// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import { Test } from "forge-std/Test.sol";
import { ParachuteVault } from "../src/ParachuteVault.sol";
import { IParachuteVault } from "../src/interfaces/IParachuteVault.sol";

contract ParachuteVaultTest is Test {
    ParachuteVault vault;
    address reactive = address(0xBEEF);
    address user = address(0xA11CE);
    address safe = address(0x5AFE);

    address constant ETH_USD = 0xa24A68DD788e1D7eb4CA517765CFb2b7e217e7a3;

    function setUp() public {
        vault = new ParachuteVault(reactive, address(this));
        vault.setSupportedFeed(ETH_USD, true);
    }

    function test_trailingStopRatchetAndTrigger() public {
        vm.prank(user);
        uint256 id = vault.openPosition(
            address(0x1),
            1 ether,
            IParachuteVault.StopType.Trailing,
            500,
            0,
            safe,
            false
        );

        vm.prank(reactive);
        vault.onPriceUpdate(ETH_USD, 2_000_00000000, block.timestamp);

        (,,,,,,, int256 hwm, int256 trail,,,,) = vault.positions(id);
        assertEq(hwm, 2_000_00000000);
        assertEq(trail, 1_900_00000000);

        vm.prank(reactive);
        vault.onPriceUpdate(ETH_USD, 1_850_00000000, block.timestamp);

        (,,,,,,,,,,, bool triggered, bool landed) = vault.positions(id);
        assertTrue(triggered);
        assertTrue(landed);
    }

    function test_fixedStop() public {
        vm.prank(user);
        uint256 id = vault.openPosition(
            address(0x2),
            2 ether,
            IParachuteVault.StopType.Fixed,
            0,
            1_500_00000000,
            safe,
            true
        );

        vm.prank(reactive);
        vault.onPriceUpdate(ETH_USD, 1_600_00000000, block.timestamp);
        (,,,,,,,,,,, bool triggeredBefore,) = vault.positions(id);
        assertFalse(triggeredBefore);

        vm.prank(reactive);
        vault.onPriceUpdate(ETH_USD, 1_400_00000000, block.timestamp);
        (,,,,,,,,,,,, bool landed) = vault.positions(id);
        assertTrue(landed);
    }
}