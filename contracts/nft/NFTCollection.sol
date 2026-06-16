// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title NFTCollection
 * @notice ERC721A-based NFT collection deployed by NFTFactory.
 *         Supports presale (Merkle allowlist) and public mint phases,
 *         per-wallet caps, EIP-2981 royalties, and metadata freeze.
 *
 * Constructor params are grouped into a CollectionConfig struct to stay
 * within Solidity's stack-depth limit.
 */
contract NFTCollection is ERC721A, ERC2981, Ownable, Pausable, ReentrancyGuard {
    // ─── Config struct (passed at construction) ────────────────────────────────

    struct CollectionConfig {
        uint256 maxSupply;
        uint256 mintPrice;          // CRO per token — public mint
        uint256 presalePrice;       // CRO per token — presale
        uint256 maxPerWallet;       // public mint cap per wallet
        uint256 presaleMaxPerWallet;
        bytes32 merkleRoot;         // keccak256(abi.encodePacked(address)) leaf format
        uint64  presaleStart;
        uint64  presaleEnd;
        uint64  publicStart;
        uint64  publicEnd;
        uint96  royaltyBps;         // EIP-2981, out of 10_000
        address royaltyReceiver;
        address fundsReceiver;      // where mint proceeds are pulled to
    }

    // ─── Events ────────────────────────────────────────────────────────────────

    event PresaleMint(address indexed minter, uint256 quantity);
    event PublicMint(address indexed minter, uint256 quantity);
    event MetadataFrozen(string uri);
    event BaseURIUpdated(string newURI);
    event Withdrawn(address indexed to, uint256 amount);

    // ─── Errors ────────────────────────────────────────────────────────────────

    error NotInPresaleWindow();
    error NotInPublicWindow();
    error InvalidMerkleProof();
    error ExceedsMaxPerWallet();
    error ExceedsMaxSupply();
    error InsufficientPayment();
    error MetadataAlreadyFrozen();
    error ZeroQuantity();
    error WithdrawFailed();

    // ─── Storage ───────────────────────────────────────────────────────────────

    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public presalePrice;
    uint256 public maxPerWallet;
    uint256 public presaleMaxPerWallet;

    uint64 public presaleStart;
    uint64 public presaleEnd;
    uint64 public publicStart;
    uint64 public publicEnd;

    bytes32 public merkleRoot;

    string private _baseTokenURI;
    bool public metadataFrozen;

    address public fundsReceiver;

    mapping(address => uint256) public presaleMinted;
    mapping(address => uint256) public publicMinted;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(
        string memory name_,
        string memory symbol_,
        address owner_,
        string memory baseURI_,
        CollectionConfig memory cfg
    ) ERC721A(name_, symbol_) Ownable(owner_) {
        require(cfg.maxSupply > 0,               "NFTCollection: zero supply");
        require(cfg.fundsReceiver != address(0), "NFTCollection: zero receiver");
        require(cfg.royaltyReceiver != address(0), "NFTCollection: zero royalty receiver");
        require(cfg.presaleEnd >= cfg.presaleStart, "NFTCollection: bad presale window");
        require(cfg.publicEnd >= cfg.publicStart,   "NFTCollection: bad public window");

        maxSupply            = cfg.maxSupply;
        mintPrice            = cfg.mintPrice;
        presalePrice         = cfg.presalePrice;
        maxPerWallet         = cfg.maxPerWallet;
        presaleMaxPerWallet  = cfg.presaleMaxPerWallet;
        merkleRoot           = cfg.merkleRoot;
        presaleStart         = cfg.presaleStart;
        presaleEnd           = cfg.presaleEnd;
        publicStart          = cfg.publicStart;
        publicEnd            = cfg.publicEnd;
        fundsReceiver        = cfg.fundsReceiver;
        _baseTokenURI        = baseURI_;

        _setDefaultRoyalty(cfg.royaltyReceiver, cfg.royaltyBps);
    }

    // ─── Presale mint ──────────────────────────────────────────────────────────

    /**
     * @notice Mint during the presale window using a Merkle proof.
     * @param quantity  Number of tokens to mint.
     * @param merkleProof Merkle proof that msg.sender is on the allowlist.
     */
    function presaleMint(uint256 quantity, bytes32[] calldata merkleProof)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (quantity == 0) revert ZeroQuantity();
        if (block.timestamp < presaleStart || block.timestamp > presaleEnd)
            revert NotInPresaleWindow();

        bytes32 leafHash = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(merkleProof, merkleRoot, leafHash))
            revert InvalidMerkleProof();

        if (presaleMinted[msg.sender] + quantity > presaleMaxPerWallet)
            revert ExceedsMaxPerWallet();
        if (_totalMinted() + quantity > maxSupply)
            revert ExceedsMaxSupply();
        if (msg.value < presalePrice * quantity)
            revert InsufficientPayment();

        presaleMinted[msg.sender] += quantity;
        _safeMint(msg.sender, quantity);

        emit PresaleMint(msg.sender, quantity);
    }

    // ─── Public mint ───────────────────────────────────────────────────────────

    /**
     * @notice Mint during the public window.
     * @param quantity Number of tokens to mint.
     */
    function publicMint(uint256 quantity)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        if (quantity == 0) revert ZeroQuantity();
        if (block.timestamp < publicStart || block.timestamp > publicEnd)
            revert NotInPublicWindow();
        if (publicMinted[msg.sender] + quantity > maxPerWallet)
            revert ExceedsMaxPerWallet();
        if (_totalMinted() + quantity > maxSupply)
            revert ExceedsMaxSupply();
        if (msg.value < mintPrice * quantity)
            revert InsufficientPayment();

        publicMinted[msg.sender] += quantity;
        _safeMint(msg.sender, quantity);

        emit PublicMint(msg.sender, quantity);
    }

    // ─── Owner: reserve mint ───────────────────────────────────────────────────

    /**
     * @notice Owner can mint a reserved allocation at any time.
     */
    function ownerMint(address to, uint256 quantity) external onlyOwner {
        if (quantity == 0) revert ZeroQuantity();
        if (_totalMinted() + quantity > maxSupply) revert ExceedsMaxSupply();
        _safeMint(to, quantity);
    }

    // ─── Metadata management ───────────────────────────────────────────────────

    function setBaseURI(string calldata newURI) external onlyOwner {
        if (metadataFrozen) revert MetadataAlreadyFrozen();
        _baseTokenURI = newURI;
        emit BaseURIUpdated(newURI);
    }

    /**
     * @notice Permanently lock the baseURI. Cannot be undone.
     */
    function freezeMetadata() external onlyOwner {
        if (metadataFrozen) revert MetadataAlreadyFrozen();
        metadataFrozen = true;
        emit MetadataFrozen(_baseTokenURI);
    }

    // ─── Funds management ──────────────────────────────────────────────────────

    /**
     * @notice Pull all collected mint proceeds to the fundsReceiver.
     *         Callable by the owner or the fundsReceiver themselves.
     */
    function withdraw() external nonReentrant {
        require(
            msg.sender == owner() || msg.sender == fundsReceiver,
            "NFTCollection: not authorized"
        );
        uint256 balance = address(this).balance;
        require(balance > 0, "NFTCollection: nothing to withdraw");
        (bool ok, ) = payable(fundsReceiver).call{value: balance}("");
        if (!ok) revert WithdrawFailed();
        emit Withdrawn(fundsReceiver, balance);
    }

    // ─── Admin ─────────────────────────────────────────────────────────────────

    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
    }

    function setMintPhases(
        uint64 _presaleStart,
        uint64 _presaleEnd,
        uint64 _publicStart,
        uint64 _publicEnd
    ) external onlyOwner {
        require(_presaleEnd >= _presaleStart, "NFTCollection: bad presale window");
        require(_publicEnd >= _publicStart,   "NFTCollection: bad public window");
        presaleStart = _presaleStart;
        presaleEnd   = _presaleEnd;
        publicStart  = _publicStart;
        publicEnd    = _publicEnd;
    }

    function setMintPrices(uint256 _mintPrice, uint256 _presalePrice) external onlyOwner {
        mintPrice    = _mintPrice;
        presalePrice = _presalePrice;
    }

    function setFundsReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "NFTCollection: zero address");
        fundsReceiver = _receiver;
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── ERC721A overrides ─────────────────────────────────────────────────────

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    // ─── ERC165 ────────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return ERC721A.supportsInterface(interfaceId)
            || ERC2981.supportsInterface(interfaceId);
    }

    // ─── View helpers ──────────────────────────────────────────────────────────

    function totalMinted() external view returns (uint256) {
        return _totalMinted();
    }

    function remainingSupply() external view returns (uint256) {
        return maxSupply - _totalMinted();
    }
}