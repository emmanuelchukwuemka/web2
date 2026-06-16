// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ILaunchpadController.sol";
import "./interfaces/IVVSRouter.sol";

/**
 * @title BondingCurve
 * @notice Virtual-reserve constant-product bonding curve (x·y = k).
 *         Deployed as an EIP-1167 minimal proxy clone by TokenFactory.
 *         Call initialize() once after cloning — constructor is intentionally empty.
 *
 * Lifecycle:
 *   1. TokenFactory clones this implementation and calls initialize().
 *   2. Users buy() and sell() until realCroRaised >= graduationThreshold.
 *   3. _graduate() adds liquidity to VVS and burns the LP tokens.
 */
contract BondingCurve is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ─────────────────────────────────────────────────────────────

    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 public constant BPS_DENOM = 10_000;

    // ─── Events ────────────────────────────────────────────────────────────────

    event Buy(address indexed buyer, uint256 croIn, uint256 tokensOut, uint256 fee);
    event Sell(address indexed seller, uint256 tokensIn, uint256 croOut, uint256 fee);
    event Graduated(address indexed token, uint256 croForLp, uint256 tokensForLp, address pair);

    // ─── State ─────────────────────────────────────────────────────────────────

    bool private _initialized;

    IERC20 public token;
    ILaunchpadController public controller;
    IVVSRouter public vvsRouter;

    uint256 public croReserves;       // virtual + real CRO for pricing
    uint256 public tokenReserves;     // tokens remaining on the curve
    uint256 public realCroRaised;     // actual CRO collected (graduation trigger)
    uint256 public reservedFees;      // accumulated fees not yet forwarded
    bool public graduated;

    uint256 public launchBlock;       // block at which the curve was initialized

    // Anti-bot tracking
    mapping(address => uint256) public lastBuyBlock;
    mapping(address => uint256) public lastBuyTimestamp;
    mapping(address => uint256) public walletTokenBalance; // rough tracking for anti-bot cap

    // ─── Initializer (called once by factory after clone) ──────────────────────

    function initialize(
        address _token,
        address _controller,
        address _vvsRouter,
        uint256 _virtualCroReserve,
        uint256 _tokenSupply
    ) external {
        require(!_initialized, "BondingCurve: already initialized");
        _initialized = true;

        token = IERC20(_token);
        controller = ILaunchpadController(_controller);
        vvsRouter = IVVSRouter(_vvsRouter);

        // Virtual reserves seed a non-zero starting price: P0 = virtualCro / tokenSupply
        croReserves = _virtualCroReserve;
        tokenReserves = _tokenSupply;
        launchBlock = block.number;
    }

    // ─── View helpers ──────────────────────────────────────────────────────────

    /**
     * @notice Tokens received for `croIn` (fee-excluded amount).
     */
    function getTokensOut(uint256 croIn) public view returns (uint256) {
        require(croIn > 0, "BondingCurve: zero input");
        uint256 newCro = croReserves + croIn;
        uint256 newTokens = (croReserves * tokenReserves) / newCro;
        return tokenReserves - newTokens;
    }

    /**
     * @notice CRO received for selling `tokensIn` (fee-excluded amount).
     */
    function getCroOut(uint256 tokensIn) public view returns (uint256) {
        require(tokensIn > 0, "BondingCurve: zero input");
        uint256 newTokens = tokenReserves + tokensIn;
        uint256 newCro = (croReserves * tokenReserves) / newTokens;
        return croReserves - newCro;
    }

    /**
     * @notice Current implied price in CRO per token (18-decimal fixed point).
     */
    function currentPrice() external view returns (uint256) {
        return (croReserves * 1e18) / tokenReserves;
    }

    // ─── Buy ───────────────────────────────────────────────────────────────────

    /**
     * @notice Buy tokens with CRO.
     * @param minTokensOut Minimum tokens to receive (slippage guard).
     */
    function buy(uint256 minTokensOut) external payable nonReentrant {
        require(!graduated, "BondingCurve: graduated");
        require(!controller.paused(), "BondingCurve: paused");
        require(!controller.blocklisted(msg.sender), "BondingCurve: blocklisted");
        require(msg.value > 0, "BondingCurve: zero value");

        // ── Anti-bot cooldown ──
        uint256 cooldown = controller.buyCooldown();
        require(
            block.timestamp >= lastBuyTimestamp[msg.sender] + cooldown,
            "BondingCurve: cooldown active"
        );

        // ── Fee split ──
        uint256 fee = (msg.value * controller.feeBps()) / BPS_DENOM;
        uint256 croIn = msg.value - fee;

        // ── Pricing ──
        uint256 tokensOut = getTokensOut(croIn);
        require(tokensOut >= minTokensOut, "BondingCurve: slippage");
        require(tokensOut <= tokenReserves, "BondingCurve: insufficient supply");

        // ── Anti-bot max wallet cap (first N blocks only) ──
        uint256 antiBotBlocks = controller.antiBotBlocks();
        if (block.number <= launchBlock + antiBotBlocks) {
            uint256 maxBps = controller.antiBotMaxBps();
            uint256 cap = (token.totalSupply() * maxBps) / BPS_DENOM;
            require(
                walletTokenBalance[msg.sender] + tokensOut <= cap,
                "BondingCurve: anti-bot cap"
            );
        }

        // ── Checks-Effects-Interactions ──
        lastBuyTimestamp[msg.sender] = block.timestamp;
        lastBuyBlock[msg.sender] = block.number;
        walletTokenBalance[msg.sender] += tokensOut;

        croReserves += croIn;
        tokenReserves -= tokensOut;
        realCroRaised += croIn;
        reservedFees += fee;

        // Transfer fee to treasury
        _forwardFee(fee);

        // Transfer tokens to buyer
        token.safeTransfer(msg.sender, tokensOut);

        emit Buy(msg.sender, croIn, tokensOut, fee);

        // ── Check graduation ──
        if (realCroRaised >= controller.graduationThreshold()) {
            _graduate();
        }
    }

    // ─── Sell ──────────────────────────────────────────────────────────────────

    /**
     * @notice Sell tokens back to the curve for CRO.
     * @param tokensIn  Amount of tokens to sell.
     * @param minCroOut Minimum CRO to receive (slippage guard).
     */
    function sell(uint256 tokensIn, uint256 minCroOut) external nonReentrant {
        require(!graduated, "BondingCurve: graduated");
        require(!controller.paused(), "BondingCurve: paused");
        require(!controller.blocklisted(msg.sender), "BondingCurve: blocklisted");
        require(tokensIn > 0, "BondingCurve: zero input");

        // ── Pricing (pre-fee) ──
        uint256 rawCroOut = getCroOut(tokensIn);

        // ── Fee deducted from proceeds ──
        uint256 fee = (rawCroOut * controller.feeBps()) / BPS_DENOM;
        uint256 croOut = rawCroOut - fee;

        require(croOut >= minCroOut, "BondingCurve: slippage");
        require(address(this).balance - reservedFees >= rawCroOut, "BondingCurve: insufficient liquidity");

        // ── Checks-Effects-Interactions ──
        if (walletTokenBalance[msg.sender] >= tokensIn) {
            walletTokenBalance[msg.sender] -= tokensIn;
        }

        tokenReserves += tokensIn;
        croReserves -= rawCroOut;
        reservedFees += fee;

        // Pull tokens from seller
        token.safeTransferFrom(msg.sender, address(this), tokensIn);

        // Forward fee to treasury
        _forwardFee(fee);

        // Pay CRO to seller
        (bool ok, ) = payable(msg.sender).call{value: croOut}("");
        require(ok, "BondingCurve: CRO transfer failed");

        emit Sell(msg.sender, tokensIn, croOut, fee);
    }

    // ─── Graduation ────────────────────────────────────────────────────────────

    /**
     * @dev Graduates the token to VVS DEX.
     *      - Sets graduated = true BEFORE any external calls (re-entrancy guard + state).
     *      - Sends all remaining tokens + CRO to VVS as liquidity.
     *      - LP tokens are burned by sending to the dead address.
     */
    function _graduate() internal {
        // Guard against double-graduation (also enforced by graduated bool on buy/sell)
        require(!graduated, "BondingCurve: already graduated");
        graduated = true;

        uint256 tokensForLp = tokenReserves;
        // All CRO on the contract excluding any unreforwarded fee buffer
        uint256 croForLp = address(this).balance - reservedFees;

        require(tokensForLp > 0, "BondingCurve: no tokens for LP");
        require(croForLp > 0, "BondingCurve: no CRO for LP");

        // Approve router to spend tokens
        IERC20(address(token)).approve(address(vvsRouter), tokensForLp);

        // Set conservative minimums (5% slippage) to avoid sandwich attacks
        uint256 minTokens = (tokensForLp * 9500) / BPS_DENOM;
        uint256 minCro = (croForLp * 9500) / BPS_DENOM;

        (uint256 usedTokens, uint256 usedCro, ) = vvsRouter.addLiquidityETH{value: croForLp}(
            address(token),
            tokensForLp,
            minTokens,
            minCro,
            DEAD_ADDRESS,        // LP tokens burned
            block.timestamp + 300
        );

        // Clear reserves (curve is done)
        tokenReserves = 0;
        croReserves = 0;

        emit Graduated(address(token), usedCro, usedTokens, address(0));
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    function _forwardFee(uint256 fee) internal {
        if (fee == 0) return;
        reservedFees -= fee;
        address treasury = controller.treasury();
        (bool ok, ) = payable(treasury).call{value: fee}("");
        require(ok, "BondingCurve: fee transfer failed");
    }

    // ─── Fallback ──────────────────────────────────────────────────────────────

    receive() external payable {}
}