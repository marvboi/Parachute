// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.29;

import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {Owned} from "../../src/Owned.sol";
import {SifiVault} from "../../src/sifi/SifiVault.sol";
import {ISwapAdapter} from "../../src/sifi/ISwapAdapter.sol";
import {MockToken} from "../../src/sifi/mocks/MockToken.sol";
import {SifiBase} from "./SifiBase.sol";

/// @dev Adapter that tries to re-enter the vault during a swap.
contract ReentrantAdapter is ISwapAdapter {
    SifiVault internal vault;
    address internal reactive;

    constructor(SifiVault vault_, address reactive_) {
        vault = vault_;
        reactive = reactive_;
    }

    function swap(address, address, uint256, uint256, address) external returns (uint256) {
        vault.executeStop(reactive, 2, 1, 1, 1, block.timestamp);
        return 0;
    }
}

/// @dev Adapter that pulls the tokens but pays nothing.
contract ThiefAdapter is ISwapAdapter {
    function swap(address tokenIn, address, uint256 amountIn, uint256, address) external returns (uint256) {
        MockToken(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        return type(uint256).max;
    }
}

contract SifiVaultTest is SifiBase {
    function _exec(uint256 id, uint64 nonce, uint256 price, uint256 high, uint256 updatedAt) internal {
        vm.prank(proxy);
        vault.executeStop(address(reactive), id, nonce, price, high, updatedAt);
    }

    // ---------- funds ----------

    function test_openRecordsPosition() public {
        uint256 id = _open(weth, 3 ether, ethFeed);
        SifiVault.Position memory p = vault.position(id);
        assertEq(p.token, address(weth));
        assertEq(p.amount, 3 ether);
        assertEq(p.feed, address(ethFeed));
        assertEq(p.tokenDecimals, 18);
        assertEq(uint8(p.status), uint8(SifiVault.Status.Idle));
        assertEq(vault.committed(address(weth)), 3 ether);
        assertEq(vault.positionCount(), 1);
    }

    function test_onlyOwnerManages() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.startPrank(stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.open(address(weth), 1, address(ethFeed), 8, stranger);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.withdraw(id, 1);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.armFixed(id, 1, address(0), address(0), 0);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.cancel(id);
        vm.expectRevert(Owned.NotOwner.selector);
        vault.sweep(address(weth), stranger);
        vm.stopPrank();
    }

    function test_openValidation() public {
        vm.startPrank(user);
        vm.expectRevert(Owned.ZeroAddress.selector);
        vault.open(address(weth), 1, address(0), 8, safe);
        vm.expectRevert(Owned.ZeroAddress.selector);
        vault.open(address(weth), 1, address(ethFeed), 8, address(0));
        vm.expectRevert(SifiVault.InvalidAmount.selector);
        vault.open(address(weth), 0, address(ethFeed), 8, safe);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.open(address(weth), 1, address(ethFeed), 19, safe);
        vm.stopPrank();
    }

    function test_withdrawPartialThenFullCloses() public {
        uint256 id = _open(weth, 2 ether, ethFeed);
        vm.startPrank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        vault.withdraw(id, 0.5 ether); // cancels the armed stop
        assertEq(uint8(_status(id)), uint8(SifiVault.Status.Idle));
        vault.withdraw(id, 1.5 ether);
        vm.stopPrank();
        assertEq(uint8(_status(id)), uint8(SifiVault.Status.Closed));
        assertEq(weth.balanceOf(user), 1_000 ether);
        assertEq(vault.committed(address(weth)), 0);
        vm.prank(user);
        vm.expectRevert(SifiVault.BadStatus.selector);
        vault.fund(id, 1);
    }

    function test_withdrawTooMuchReverts() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vm.expectRevert(SifiVault.InvalidAmount.selector);
        vault.withdraw(id, 1 ether + 1);
    }

    function test_sweepOnlyFreeFunds() public {
        _open(weth, 1 ether, ethFeed);
        weth.mint(address(vault), 0.25 ether); // stray transfer
        vm.prank(user);
        vault.sweep(address(weth), user);
        assertEq(weth.balanceOf(address(vault)), 1 ether);
        vm.prank(user);
        vm.expectRevert(SifiVault.InvalidAmount.selector);
        vault.sweep(address(weth), user);
    }

    // ---------- arming ----------

    function test_armValidation() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.startPrank(user);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armFixed(id, 0, address(0), address(0), 0);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armTrailing(id, 5, 0, address(0), address(0), 0); // below min trail
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armTrailing(id, 5_001, 0, address(0), address(0), 0);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armFixed(id, 1, address(usdc), address(0), 0); // payout without adapter
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armFixed(id, 1, address(weth), address(adapter), 0); // payout == token
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.armFixed(id, 1, address(usdc), address(adapter), 2_001);
        vm.expectRevert(SifiVault.UnknownPosition.selector);
        vault.armFixed(99, 1, address(0), address(0), 0);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.rearm(id); // nothing to re-arm yet
        vm.stopPrank();
    }

    function test_rearmBumpsNonce() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.startPrank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        vault.cancel(id);
        vault.rearm(id);
        vm.stopPrank();
        assertEq(vault.position(id).nonce, 2);
        assertEq(uint8(_status(id)), uint8(SifiVault.Status.Armed));
    }

    // ---------- callback auth ----------

    function test_executeRejectsNonProxy() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, stranger, proxy));
        vault.executeStop(address(reactive), id, 1, 1_000e8, 0, block.timestamp);
    }

    function test_executeRejectsWrongReactiveSender() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        vm.prank(proxy);
        vm.expectRevert(
            abi.encodeWithSelector(AbstractCallback.CallbackNotAuthorized.selector, stranger, address(reactive))
        );
        vault.executeStop(stranger, id, 1, 1_000e8, 0, block.timestamp);
    }

    function test_executeChecks() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);

        vm.startPrank(proxy);
        vm.expectRevert(SifiVault.NonceMismatch.selector);
        vault.executeStop(address(reactive), id, 2, 1_000e8, 0, block.timestamp);
        vm.expectRevert(SifiVault.InvalidPrice.selector);
        vault.executeStop(address(reactive), id, 1, 0, 0, block.timestamp);
        vm.expectRevert(SifiVault.StopNotHit.selector);
        vault.executeStop(address(reactive), id, 1, 1_900e8 + 1, 0, block.timestamp);
        vm.expectRevert(SifiVault.PriceBeforeArm.selector);
        vault.executeStop(address(reactive), id, 1, 1_000e8, 0, block.timestamp - 1);
        vm.expectRevert(SifiVault.PriceTooOld.selector);
        vault.executeStop(address(reactive), id, 1, 1_000e8, 0, block.timestamp + 1);
        vm.stopPrank();

        uint256 armedAt = block.timestamp;
        vm.warp(armedAt + 1 hours + 1);
        vm.prank(proxy);
        vm.expectRevert(SifiVault.PriceTooOld.selector);
        vault.executeStop(address(reactive), id, 1, 1_000e8, 0, armedAt);

        vm.prank(proxy);
        vm.expectRevert(SifiVault.BadStatus.selector);
        vault.executeStop(address(reactive), 42, 1, 1_000e8, 0, block.timestamp);
    }

    function test_trailingExecuteChecksHigh() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armTrailing(id, 500, 2_000e8, address(0), address(0), 0);
        vm.startPrank(proxy);
        vm.expectRevert(SifiVault.InvalidPrice.selector);
        vault.executeStop(address(reactive), id, 1, 1_800e8, 1_900e8, block.timestamp); // high below anchor
        vm.expectRevert(SifiVault.StopNotHit.selector);
        vault.executeStop(address(reactive), id, 1, 2_000e8, 2_100e8, block.timestamp); // 2000 > 1995
        vault.executeStop(address(reactive), id, 1, 1_995e8, 2_100e8, block.timestamp);
        vm.stopPrank();
        assertEq(weth.balanceOf(safe), 1 ether);
    }

    function test_executeOnceOnly() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        _exec(id, 1, 1_800e8, 0, block.timestamp);
        vm.prank(proxy);
        vm.expectRevert(SifiVault.BadStatus.selector);
        vault.executeStop(address(reactive), id, 1, 1_800e8, 0, block.timestamp);
        assertEq(weth.balanceOf(safe), 1 ether);
    }

    function test_cancelledStopCannotExecute() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.startPrank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        vault.cancel(id);
        vm.stopPrank();
        vm.prank(proxy);
        vm.expectRevert(SifiVault.BadStatus.selector);
        vault.executeStop(address(reactive), id, 1, 1_800e8, 0, block.timestamp);
    }

    function test_refundAfterExecuteAndRearm() public {
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(0), address(0), 0);
        _exec(id, 1, 1_800e8, 0, block.timestamp);
        vm.startPrank(user);
        vm.expectRevert(SifiVault.InvalidAmount.selector);
        vault.rearm(id); // empty
        vault.fund(id, 2 ether);
        vault.rearm(id);
        vm.stopPrank();
        _exec(id, 2, 1_700e8, 0, block.timestamp);
        assertEq(weth.balanceOf(safe), 3 ether);
    }

    // ---------- payout ----------

    function test_swapToStableWithOracleFloor() public {
        uint256 id = _open(weth, 2 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(usdc), address(adapter), 100); // 1%
        _exec(id, 1, 1_900e8, 0, block.timestamp);
        // adapter pays 2000 USDC/WETH, floor is 1881 USDC/WETH
        assertEq(usdc.balanceOf(safe), 4_000e6);
        assertEq(weth.balanceOf(safe), 0);
    }

    function test_swapBelowFloorFallsBackToToken() public {
        adapter.setRate(1_000e6); // pool far below oracle
        uint256 id = _open(weth, 2 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(usdc), address(adapter), 100);
        _exec(id, 1, 1_900e8, 0, block.timestamp);
        assertEq(usdc.balanceOf(safe), 0);
        assertEq(weth.balanceOf(safe), 2 ether);
        assertEq(weth.allowance(address(vault), address(adapter)), 0);
    }

    function test_brokenAdapterFallsBack() public {
        adapter.setBroken(true);
        uint256 id = _open(wbtc, 1e8, btcFeed);
        vm.prank(user);
        vault.armFixed(id, 50_000e8, address(usdc), address(adapter), 50);
        _exec(id, 1, 49_000e8, 0, block.timestamp);
        assertEq(wbtc.balanceOf(safe), 1e8);
    }

    function test_thiefAdapterReverts() public {
        ThiefAdapter thief = new ThiefAdapter();
        uint256 id = _open(weth, 1 ether, ethFeed);
        vm.prank(user);
        vault.armFixed(id, 1_900e8, address(usdc), address(thief), 100);
        vm.prank(proxy);
        vm.expectRevert(SifiVault.TokenTransferFailed.selector);
        vault.executeStop(address(reactive), id, 1, 1_800e8, 0, block.timestamp);
        assertEq(weth.balanceOf(address(vault)), 1 ether);
    }

    function test_reentrantAdapterCannotDrain() public {
        ReentrantAdapter bad = new ReentrantAdapter(vault, address(reactive));
        uint256 a = _open(weth, 1 ether, ethFeed);
        uint256 b = _open(weth, 1 ether, ethFeed);
        vm.startPrank(user);
        vault.armFixed(a, 1_900e8, address(usdc), address(bad), 100);
        vault.armFixed(b, 1_900e8, address(0), address(0), 0);
        vm.stopPrank();
        // the re-entry reverts inside the adapter, so the vault falls back to a plain transfer
        _exec(a, 1, 1_800e8, 0, block.timestamp);
        assertEq(weth.balanceOf(safe), 1 ether);
        assertEq(uint8(_status(b)), uint8(SifiVault.Status.Armed));
        assertEq(vault.position(b).amount, 1 ether);
    }

    function test_maxPriceAgeBounds() public {
        vm.startPrank(user);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.setMaxPriceAge(0);
        vm.expectRevert(SifiVault.InvalidConfig.selector);
        vault.setMaxPriceAge(1 days + 1);
        vault.setMaxPriceAge(10 minutes);
        vm.stopPrank();
        assertEq(vault.maxPriceAge(), 10 minutes);
    }

    // ---------- isolation ----------

    function test_executingOnePositionLeavesOthers() public {
        uint256 a = _open(weth, 1 ether, ethFeed);
        uint256 b = _open(weth, 4 ether, ethFeed);
        uint256 c = _open(wbtc, 2e8, btcFeed);
        vm.startPrank(user);
        vault.armFixed(a, 1_900e8, address(0), address(0), 0);
        vault.armTrailing(b, 1_000, 2_000e8, address(0), address(0), 0);
        vault.armFixed(c, 50_000e8, address(0), address(0), 0);
        vm.stopPrank();

        _exec(a, 1, 1_850e8, 0, block.timestamp);
        assertEq(weth.balanceOf(safe), 1 ether);
        assertEq(weth.balanceOf(address(vault)), 4 ether);
        assertEq(vault.committed(address(weth)), 4 ether);
        assertEq(uint8(_status(b)), uint8(SifiVault.Status.Armed));
        assertEq(uint8(_status(c)), uint8(SifiVault.Status.Armed));
        assertEq(wbtc.balanceOf(address(vault)), 2e8);
    }

    function testFuzz_isolation(uint96[5] memory amounts, uint8 fireMask) public {
        uint256[5] memory ids;
        uint256 total;
        for (uint256 i; i < 5; ++i) {
            uint256 amt = bound(amounts[i], 1, 100 ether);
            ids[i] = _open(weth, amt, ethFeed);
            total += amt;
            vm.prank(user);
            vault.armFixed(ids[i], 1_900e8, address(0), address(0), 0);
        }
        uint256 paid;
        for (uint256 i; i < 5; ++i) {
            if (fireMask & (1 << i) == 0) continue;
            uint256 amt = vault.position(ids[i]).amount;
            _exec(ids[i], 1, 1_800e8, 0, block.timestamp);
            paid += amt;
        }
        assertEq(weth.balanceOf(safe), paid);
        assertEq(weth.balanceOf(address(vault)), total - paid);
        assertEq(vault.committed(address(weth)), total - paid);
        for (uint256 i; i < 5; ++i) {
            bool fired = fireMask & (1 << i) != 0;
            assertEq(uint8(_status(ids[i])), uint8(fired ? SifiVault.Status.Executed : SifiVault.Status.Armed));
        }
    }

    function testFuzz_swapDecimals(uint64 amountRaw, uint64 priceRaw, uint16 slip) public {
        uint256 amount = bound(amountRaw, 1e4, 50e8); // WBTC 8 dec
        uint256 price = bound(priceRaw, 1e8, 200_000e8);
        slip = uint16(bound(slip, 0, 2_000));
        // adapter pays exactly the oracle price, so the floor always passes
        MockToken stable18 = new MockToken("Dai", "DAI", 18);
        adapter.setRate(price * 1e10 * 1e10); // 1e18 WBTC units -> payout units at 18 dec
        stable18.mint(address(adapter), type(uint128).max);
        uint256 id = _open(wbtc, amount, btcFeed);
        vm.prank(user);
        vault.armFixed(id, price, address(stable18), address(adapter), slip);
        _exec(id, 1, price, 0, block.timestamp);
        uint256 expected = (amount * price * 1e10) / 1e8;
        assertApproxEqAbs(stable18.balanceOf(safe), expected, 1e10);
    }
}
