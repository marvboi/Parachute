/** Curated on-chain excerpts for the Contracts section (from repo sources). */

export const SIFI_REACTIVE_EXCERPT = `function react(LogRecord memory log_) external onlySystem {
    if (log_.chainId == vaultChainId && log_.contractAddress == vault && vault != address(0)) {
        if (log_.topic0 == FeedEvents.POSITION_ARMED && log_.opCode == 4) {
            _onArmed(log_);
        } else if (log_.topic0 == FeedEvents.POSITION_DISARMED && log_.opCode == 3) {
            _onDisarmed(uint256(log_.topic1), uint64(log_.topic2));
        }
        return;
    }
    if (log_.chainId == feedChainId && log_.topic0 == FeedEvents.ANSWER_UPDATED && log_.opCode == 3) {
        Feed storage f = feeds[log_.contractAddress];
        if (f.allowed && f.subscribed) _onPrice(log_.contractAddress, f, log_);
    }
}

// … trailing ratchet on AnswerUpdated …
if (w.mode == FeedEvents.MODE_TRAILING) {
    uint256 high = TrailMath.ratchet(w.high, price);
    if (high != w.high) {
        w.high = high;
        emit HighRaised(id, high, TrailMath.trailStop(high, w.trailBps));
    }
    level = TrailMath.trailStop(high, w.trailBps);
}

// … callback to vault when stop is hit …
SYSTEM.requestCallbackV_1_0(
    ISystemContract.CallbackConfiguration_V_1_0({
        chainId: vaultChainId,
        recipient: vault,
        gasLimit: callbackGasLimit,
        payload: abi.encodeWithSignature(
            "executeStop(address,uint256,uint64,uint256,uint256,uint256)",
            address(0), id, nonce, price, high, updatedAt
        )
    })
);`;

export const SIFI_VAULT_EXCERPT = `/// @notice Reactive callback. The first argument is overwritten by the network
/// with the requesting reactive contract and checked against the one set at deploy.
function executeStop(
    address reactive,
    uint256 id,
    uint64 nonce,
    uint256 price,
    uint256 high,
    uint256 updatedAt
)
    external
    onlyServiceProvider
    onlyCallbackSender(reactive)
    nonReentrant
{
    Position storage p = _positions[id];
    if (p.status != Status.Armed) revert BadStatus();
    if (nonce != p.nonce) revert NonceMismatch();
    // … price freshness checks …

    uint256 stopLevel;
    if (p.mode == FeedEvents.MODE_FIXED) {
        stopLevel = p.stopPrice;
        if (price > stopLevel) revert StopNotHit();
    } else {
        if (high < price || high < p.anchorPrice) revert InvalidPrice();
        stopLevel = TrailMath.trailStop(high, p.trailBps);
        if (price > stopLevel) revert StopNotHit();
    }

    uint256 amount = p.amount;
    p.status = Status.Executed;
    p.amount = 0;
    committed[p.token] -= amount;

    (address payoutToken, uint256 paid) = _payout(id, p, amount, price);
    emit StopExecuted(id, nonce, price, high, stopLevel, payoutToken, paid, p.safe);
}`;