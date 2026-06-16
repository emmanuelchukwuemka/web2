// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILaunchpadController {
    function feeBps() external view returns (uint256);
    function creationFee() external view returns (uint256);
    function nftCreationFee() external view returns (uint256);
    function graduationThreshold() external view returns (uint256);
    function antiBotBlocks() external view returns (uint256);
    function antiBotMaxBps() external view returns (uint256);
    function buyCooldown() external view returns (uint256);
    function treasury() external view returns (address);
    function paused() external view returns (bool);
    function blocklisted(address wallet) external view returns (bool);
}