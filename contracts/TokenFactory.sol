// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LaunchToken.sol";
import "./BondingCurve.sol";
import "./interfaces/ILaunchpadController.sol";
import "./interfaces/IVVSRouter.sol";

/**
 * @title TokenFactory
 * @notice Deploys LaunchToken + BondingCurve (as EIP-1167 clone) pairs.
 *         Using clones keeps per-launch gas cost minimal — only storage is
 *         initialized, not the full BondingCurve bytecode.
 *
 * Flow:
 *   createToken() → deploys LaunchToken → clones BondingCurve → initializes
 *   curve → mints entire supply to curve → emits TokenCreated
 */
contract TokenFactory is Ownable, ReentrancyGuard {
    using Clones for address;

    // ─── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant TOKEN_SUPPLY = 1_000_000_000 * 1e18; // 1 billion tokens
    uint256 public constant VIRTUAL_CRO_RESERVE = 10_000 * 1e18; // virtual seed reserve

    // ─── Events ────────────────────────────────────────────────────────────────

    event TokenCreated(
        address indexed token,
        address indexed curve,
        address indexed creator,
        string name,
        string symbol,
        uint256 timestamp
    );

    event CurveImplementationUpdated(address oldImpl, address newImpl);

    // ─── State ─────────────────────────────────────────────────────────────────

    ILaunchpadController public immutable controller;
    IVVSRouter public immutable vvsRouter;

    /// @notice The BondingCurve implementation all clones point to.
    address public curveImplementation;

    /// @notice All tokens created via this factory, for enumeration.
    address[] public allTokens;

    /// @notice token address → curve address
    mapping(address => address) public tokenToCurve;

    /// @notice curve address → token address
    mapping(address => address) public curveToToken;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address _controller,
        address _vvsRouter,
        address _curveImplementation
    ) Ownable(msg.sender) {
        require(_controller != address(0), "Factory: zero controller");
        require(_vvsRouter != address(0), "Factory: zero router");
        require(_curveImplementation != address(0), "Factory: zero curve impl");

        controller = ILaunchpadController(_controller);
        vvsRouter = IVVSRouter(_vvsRouter);
        curveImplementation = _curveImplementation;
    }

    // ─── Token creation ────────────────────────────────────────────────────────

    /**
     * @notice Launch a new token on the bonding curve.
     * @param name_   ERC20 name.
     * @param symbol_ ERC20 symbol.
     */
    function createToken(
        string calldata name_,
        string calldata symbol_
    ) external payable nonReentrant returns (address token, address curve) {
        require(!controller.paused(), "Factory: paused");

        uint256 creationFee = controller.creationFee();
        require(msg.value >= creationFee, "Factory: insufficient creation fee");

        // ── Clone the curve implementation ──
        curve = curveImplementation.clone();

        // ── Deploy token — mints entire supply to the curve ──
        token = address(
            new LaunchToken(
                name_,
                symbol_,
                TOKEN_SUPPLY,
                curve,
                address(this)
            )
        );

        // ── Initialize the curve ──
        BondingCurve(payable(curve)).initialize(
            token,
            address(controller),
            address(vvsRouter),
            VIRTUAL_CRO_RESERVE,
            TOKEN_SUPPLY
        );

        // ── Register ──
        allTokens.push(token);
        tokenToCurve[token] = curve;
        curveToToken[curve] = token;

        // ── Forward creation fee to treasury ──
        if (creationFee > 0) {
            (bool ok, ) = payable(controller.treasury()).call{value: creationFee}("");
            require(ok, "Factory: fee transfer failed");
        }

        // ── Refund any overpayment ──
        uint256 excess = msg.value - creationFee;
        if (excess > 0) {
            (bool refundOk, ) = payable(msg.sender).call{value: excess}("");
            require(refundOk, "Factory: refund failed");
        }

        emit TokenCreated(token, curve, msg.sender, name_, symbol_, block.timestamp);
    }

    // ─── View helpers ──────────────────────────────────────────────────────────

    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }

    function getTokens(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory tokens, address[] memory curves)
    {
        uint256 end = offset + limit;
        if (end > allTokens.length) end = allTokens.length;
        uint256 count = end - offset;

        tokens = new address[](count);
        curves = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            tokens[i] = allTokens[offset + i];
            curves[i] = tokenToCurve[allTokens[offset + i]];
        }
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function setCurveImplementation(address _newImpl) external onlyOwner {
        require(_newImpl != address(0), "Factory: zero impl");
        emit CurveImplementationUpdated(curveImplementation, _newImpl);
        curveImplementation = _newImpl;
    }
}