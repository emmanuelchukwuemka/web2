// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Staking
 * @notice Stake $WOLF to earn a proportional share of platform CRO fees.
 *
 * Reward mechanism — accumulator pattern:
 *   accCroPerShare tracks the total CRO reward earned per staked WOLF token
 *   (scaled by PRECISION = 1e18 to avoid fractional arithmetic).
 *
 *   When fees are deposited:
 *     accCroPerShare += feeAmount * PRECISION / totalStaked
 *
 *   A user's pending reward at any point:
 *     pending = stakedAmount * accCroPerShare / PRECISION - rewardDebt
 *
 *   rewardDebt is updated on every stake / unstake / claim so that only
 *   rewards accumulated *after* a user's last action are claimable.
 *
 * Fee routing:
 *   Call depositFees(){value: amount} from the treasury or any authorised
 *   address to add CRO to the reward pool. The LaunchpadController treasury
 *   address can be pointed at this contract directly, or an admin can sweep
 *   fees here periodically.
 */
contract Staking is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant PRECISION = 1e18;

    // ─── Events ────────────────────────────────────────────────────────────────

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 reward);
    event FeesDeposited(address indexed from, uint256 amount);
    event EmergencyUnstaked(address indexed user, uint256 amount);

    // ─── State ─────────────────────────────────────────────────────────────────

    IERC20 public immutable wolfToken;

    uint256 public totalStaked;

    /// @notice Accumulated CRO per staked WOLF (scaled by PRECISION).
    uint256 public accCroPerShare;

    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardDebt; // already-credited portion of accCroPerShare * stakedAmount
    }

    mapping(address => UserInfo) public userInfo;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address _wolfToken) Ownable(msg.sender) {
        require(_wolfToken != address(0), "Staking: zero token");
        wolfToken = IERC20(_wolfToken);
    }

    // ─── Fee deposit ───────────────────────────────────────────────────────────

    /**
     * @notice Deposit CRO fees into the reward pool.
     *         Called by the treasury or any authorised fee source.
     *         Silently ignores deposits when nobody is staked (fees are held
     *         in contract balance and become part of the next distribution).
     */
    function depositFees() external payable {
        require(msg.value > 0, "Staking: zero deposit");
        if (totalStaked > 0) {
            accCroPerShare += (msg.value * PRECISION) / totalStaked;
        }
        emit FeesDeposited(msg.sender, msg.value);
    }

    // ─── Stake ─────────────────────────────────────────────────────────────────

    /**
     * @notice Stake WOLF tokens. Pending rewards are settled first.
     * @param amount Amount of WOLF to stake.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Staking: zero amount");

        UserInfo storage user = userInfo[msg.sender];

        // Settle any pending reward before changing the balance
        _settlePending(user);

        // Pull tokens from staker
        wolfToken.safeTransferFrom(msg.sender, address(this), amount);

        user.stakedAmount += amount;
        totalStaked += amount;

        // Record the new debt baseline so future rewards start from here
        user.rewardDebt = (user.stakedAmount * accCroPerShare) / PRECISION;

        emit Staked(msg.sender, amount);
    }

    // ─── Unstake ───────────────────────────────────────────────────────────────

    /**
     * @notice Unstake WOLF tokens. Pending rewards are settled and paid first.
     * @param amount Amount of WOLF to unstake.
     */
    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        require(amount > 0, "Staking: zero amount");
        require(user.stakedAmount >= amount, "Staking: insufficient stake");

        // Settle pending reward before reducing balance
        _settlePending(user);

        user.stakedAmount -= amount;
        totalStaked -= amount;

        // Update debt to reflect new (lower) staked balance
        user.rewardDebt = (user.stakedAmount * accCroPerShare) / PRECISION;

        wolfToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    // ─── Claim ─────────────────────────────────────────────────────────────────

    /**
     * @notice Claim accumulated CRO rewards without changing staked balance.
     */
    function claim() external nonReentrant whenNotPaused {
        UserInfo storage user = userInfo[msg.sender];
        _settlePending(user);
        // After settlement, rewardDebt is already updated inside _settlePending
    }

    // ─── Emergency unstake ─────────────────────────────────────────────────────

    /**
     * @notice Unstake all WOLF without claiming rewards.
     *         Safety valve: bypasses pause and forfeits pending rewards.
     *         Useful if a bug prevents normal unstaking.
     */
    function emergencyUnstake() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.stakedAmount;
        require(amount > 0, "Staking: nothing staked");

        totalStaked -= amount;
        user.stakedAmount = 0;
        user.rewardDebt = 0;

        wolfToken.safeTransfer(msg.sender, amount);

        emit EmergencyUnstaked(msg.sender, amount);
    }

    // ─── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Returns the pending CRO reward for a user.
     */
    function pendingRewards(address _user) external view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        if (user.stakedAmount == 0) return 0;
        uint256 accumulated = (user.stakedAmount * accCroPerShare) / PRECISION;
        return accumulated > user.rewardDebt ? accumulated - user.rewardDebt : 0;
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    /**
     * @dev Compute pending reward, pay it out, and reset the user's debt
     *      to the current accCroPerShare baseline.
     *      IMPORTANT: call this before any change to stakedAmount.
     */
    function _settlePending(UserInfo storage user) internal {
        if (user.stakedAmount > 0) {
            uint256 accumulated = (user.stakedAmount * accCroPerShare) / PRECISION;
            uint256 pending = accumulated > user.rewardDebt
                ? accumulated - user.rewardDebt
                : 0;

            if (pending > 0) {
                user.rewardDebt = accumulated;
                _sendCro(msg.sender, pending);
                emit Claimed(msg.sender, pending);
            } else {
                user.rewardDebt = accumulated;
            }
        }
    }

    function _sendCro(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "Staking: CRO transfer failed");
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Fallback ──────────────────────────────────────────────────────────────

    /// @dev Allow direct CRO sends to act as fee deposits.
    receive() external payable {
        if (totalStaked > 0) {
            accCroPerShare += (msg.value * PRECISION) / totalStaked;
        }
        emit FeesDeposited(msg.sender, msg.value);
    }
}