// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ILaunchpadController.sol";
import "./NFTCollection.sol";

/**
 * @title NFTFactory
 * @notice Deploys NFTCollection contracts on behalf of creators.
 *         Charges the platform NFT creation fee and maintains a registry
 *         of all collections for the indexer to enumerate.
 */
contract NFTFactory is Ownable, ReentrancyGuard {
    // ─── Events ────────────────────────────────────────────────────────────────

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 timestamp
    );

    // ─── Storage ───────────────────────────────────────────────────────────────

    ILaunchpadController public immutable controller;

    /// @notice All collections ever deployed by this factory.
    address[] public allCollections;

    /// @notice collection → creator
    mapping(address => address) public collectionToCreator;

    // ─── Constructor ───────────────────────────────────────────────────────────

    constructor(address _controller) Ownable(msg.sender) {
        require(_controller != address(0), "NFTFactory: zero controller");
        controller = ILaunchpadController(_controller);
    }

    // ─── Collection params struct ──────────────────────────────────────────────

    struct CreateParams {
        string  name;
        string  symbol;
        string  baseURI;
        NFTCollection.CollectionConfig config;
    }

    // ─── Collection creation ───────────────────────────────────────────────────

    /**
     * @notice Deploy a new NFT collection. The caller becomes the collection owner.
     * @param p  Creation parameters (name, symbol, baseURI, config).
     */
    function createCollection(CreateParams calldata p)
        external
        payable
        nonReentrant
        returns (address collection)
    {
        require(!controller.paused(), "NFTFactory: paused");

        uint256 fee = controller.nftCreationFee();
        require(msg.value >= fee, "NFTFactory: insufficient creation fee");

        collection = address(
            new NFTCollection(
                p.name,
                p.symbol,
                msg.sender,
                p.baseURI,
                p.config
            )
        );

        allCollections.push(collection);
        collectionToCreator[collection] = msg.sender;

        if (fee > 0) {
            (bool ok, ) = payable(controller.treasury()).call{value: fee}("");
            require(ok, "NFTFactory: fee transfer failed");
        }

        uint256 excess = msg.value - fee;
        if (excess > 0) {
            (bool refundOk, ) = payable(msg.sender).call{value: excess}("");
            require(refundOk, "NFTFactory: refund failed");
        }

        emit CollectionCreated(
            collection,
            msg.sender,
            p.name,
            p.symbol,
            p.config.maxSupply,
            block.timestamp
        );
    }

    // ─── View helpers ──────────────────────────────────────────────────────────

    function totalCollections() external view returns (uint256) {
        return allCollections.length;
    }

    function getCollections(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory collections, address[] memory creators)
    {
        uint256 end = offset + limit;
        if (end > allCollections.length) end = allCollections.length;
        uint256 count = end - offset;

        collections = new address[](count);
        creators    = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            collections[i] = allCollections[offset + i];
            creators[i]    = collectionToCreator[allCollections[offset + i]];
        }
    }
}