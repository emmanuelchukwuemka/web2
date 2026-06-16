// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title LaunchpadController
 * @notice Holds platform-wide configuration for the N.W.O Launchpad.
 *         The factory and bonding curves read from this contract, so parameters
 *         can be tuned without redeploying any other contract.
 */
contract LaunchpadController is Ownable, Pausable {
    // ─── Events ────────────────────────────────────────────────────────────────

    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event NftCreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event GraduationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event AntiBotParamsUpdated(uint256 blocks, uint256 maxBps, uint256 cooldown);
    event WalletBlocklisted(address indexed wallet, bool blocked);

    // ─── State ─────────────────────────────────────────────────────────────────

    /// @notice Protocol fee in basis points (e.g. 100 = 1%).
    uint256 public feeBps;

    /// @notice CRO required to create a new token (paid to treasury).
    uint256 public creationFee;

    /// @notice CRO required to create a new NFT collection (paid to treasury).
    uint256 public nftCreationFee;

    /// @notice Real CRO raised by the curve that triggers DEX graduation.
    uint256 public graduationThreshold;

    /// @notice Number of blocks after launch during which anti-bot limits apply.
    uint256 public antiBotBlocks;

    /// @notice Maximum a single wallet may hold as % of supply during anti-bot window (bps).
    uint256 public antiBotMaxBps;

    /// @notice Minimum seconds between a wallet's consecutive buys.
    uint256 public buyCooldown;

    /// @notice Destination for all protocol fees.
    address public treasury;

    /// @notice Wallets blocked from buying/selling on any bonding curve.
    mapping(address => bool) public blocklisted;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _treasury,
        uint256 _feeBps,
        uint256 _creationFee,
        uint256 _nftCreationFee,
        uint256 _graduationThreshold,
        uint256 _antiBotBlocks,
        uint256 _antiBotMaxBps,
        uint256 _buyCooldown
    ) Ownable(msg.sender) {
        require(_treasury != address(0), "Controller: zero treasury");
        require(_feeBps <= 1000, "Controller: fee > 10%");

        treasury = _treasury;
        feeBps = _feeBps;
        creationFee = _creationFee;
        nftCreationFee = _nftCreationFee;
        graduationThreshold = _graduationThreshold;
        antiBotBlocks = _antiBotBlocks;
        antiBotMaxBps = _antiBotMaxBps;
        buyCooldown = _buyCooldown;
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Controller: fee > 10%");
        emit FeeBpsUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    function setCreationFee(uint256 _fee) external onlyOwner {
        emit CreationFeeUpdated(creationFee, _fee);
        creationFee = _fee;
    }

    function setNftCreationFee(uint256 _fee) external onlyOwner {
        emit NftCreationFeeUpdated(nftCreationFee, _fee);
        nftCreationFee = _fee;
    }

    function setGraduationThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold > 0, "Controller: zero threshold");
        emit GraduationThresholdUpdated(graduationThreshold, _threshold);
        graduationThreshold = _threshold;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Controller: zero treasury");
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setAntiBotParams(
        uint256 _blocks,
        uint256 _maxBps,
        uint256 _cooldown
    ) external onlyOwner {
        require(_maxBps <= 10_000, "Controller: maxBps overflow");
        antiBotBlocks = _blocks;
        antiBotMaxBps = _maxBps;
        buyCooldown = _cooldown;
        emit AntiBotParamsUpdated(_blocks, _maxBps, _cooldown);
    }

    function setBlocklist(address wallet, bool blocked) external onlyOwner {
        require(wallet != address(0), "Controller: zero address");
        blocklisted[wallet] = blocked;
        emit WalletBlocklisted(wallet, blocked);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}