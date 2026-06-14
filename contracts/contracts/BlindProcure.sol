// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title BlindProcure
/// @notice Confidential reverse auctions where suppliers bid privately and buyers reveal only the winning supplier.
contract BlindProcure is ZamaEthereumConfig {
    uint32 public constant MAX_BIDS_PER_TENDER = 16;

    struct Tender {
        address buyer;
        string title;
        bytes32 specHash;
        uint64 deadline;
        uint64 budgetCap;
        bool whitelistEnabled;
        uint32 bidCount;
        bool finalized;
        bool winnerRecorded;
        address winningSupplier;
    }

    struct Bid {
        address supplier;
        euint64 price;
        bool exists;
    }

    struct TenderPrivate {
        euint64 winningBid;
        euint32 winningBidId;
    }

    uint256 public nextTenderId = 1;

    mapping(uint256 tenderId => Tender tender) public tenders;
    mapping(uint256 tenderId => TenderPrivate tenderPrivate) private _tenderPrivate;
    mapping(uint256 tenderId => mapping(uint32 bidId => Bid bid)) private _bids;
    mapping(uint256 tenderId => mapping(address supplier => bool isApproved)) public approved;
    mapping(uint256 tenderId => mapping(address supplier => bool submitted)) public hasBid;

    event TenderCreated(
        uint256 indexed tenderId,
        address indexed buyer,
        string title,
        bytes32 indexed specHash,
        uint64 deadline,
        uint64 budgetCap,
        bool whitelistEnabled
    );
    event SupplierApproved(uint256 indexed tenderId, address indexed supplier);
    event BidSubmitted(uint256 indexed tenderId, uint32 indexed bidId, address indexed supplier);
    event TenderFinalized(uint256 indexed tenderId, euint64 winningBid, euint32 winningBidId);
    event WinnerRecorded(uint256 indexed tenderId, uint32 indexed bidId, address indexed supplier);
    event AuditorAccessGranted(uint256 indexed tenderId, address indexed auditor);

    error InvalidTender();
    error InvalidDeadline();
    error NotBuyer();
    error TenderClosed();
    error TenderStillOpen();
    error SupplierNotApproved();
    error DuplicateBid();
    error AlreadyFinalized();
    error WinnerAlreadyRecorded();
    error NoWinningSupplier();
    error ZeroAddress();
    error WhitelistFrozen();
    error BidLimitReached();

    function createTender(
        string calldata title,
        bytes32 specHash,
        uint64 deadline,
        uint64 budgetCap,
        bool whitelistEnabled
    ) external returns (uint256 tenderId) {
        if (deadline <= block.timestamp) {
            revert InvalidDeadline();
        }

        tenderId = nextTenderId++;
        tenders[tenderId] = Tender({
            buyer: msg.sender,
            title: title,
            specHash: specHash,
            deadline: deadline,
            budgetCap: budgetCap,
            whitelistEnabled: whitelistEnabled,
            bidCount: 0,
            finalized: false,
            winnerRecorded: false,
            winningSupplier: address(0)
        });

        emit TenderCreated(tenderId, msg.sender, title, specHash, deadline, budgetCap, whitelistEnabled);
    }

    function approveSupplier(uint256 tenderId, address supplier) public {
        Tender storage tender = _requireTender(tenderId);
        _requireBuyer(tender);
        if (supplier == address(0)) {
            revert ZeroAddress();
        }
        if (tender.bidCount != 0) {
            revert WhitelistFrozen();
        }

        approved[tenderId][supplier] = true;
        emit SupplierApproved(tenderId, supplier);
    }

    function approveSuppliers(uint256 tenderId, address[] calldata suppliers) external {
        for (uint256 i = 0; i < suppliers.length; ++i) {
            approveSupplier(tenderId, suppliers[i]);
        }
    }

    function submitBid(
        uint256 tenderId,
        externalEuint64 encryptedPrice,
        bytes calldata inputProof
    ) external returns (uint32 bidId) {
        Tender storage tender = _requireTender(tenderId);
        if (tender.finalized || block.timestamp >= tender.deadline) {
            revert TenderClosed();
        }
        if (tender.whitelistEnabled && !approved[tenderId][msg.sender]) {
            revert SupplierNotApproved();
        }
        if (hasBid[tenderId][msg.sender]) {
            revert DuplicateBid();
        }
        if (tender.bidCount >= MAX_BIDS_PER_TENDER) {
            revert BidLimitReached();
        }

        euint64 price = FHE.fromExternal(encryptedPrice, inputProof);
        FHE.allowThis(price);
        FHE.allow(price, msg.sender);

        bidId = ++tender.bidCount;
        _bids[tenderId][bidId] = Bid({supplier: msg.sender, price: price, exists: true});
        hasBid[tenderId][msg.sender] = true;

        emit BidSubmitted(tenderId, bidId, msg.sender);
    }

    function finalizeTender(uint256 tenderId) external {
        Tender storage tender = _requireTender(tenderId);
        _requireBuyer(tender);
        if (block.timestamp < tender.deadline) {
            revert TenderStillOpen();
        }
        if (tender.finalized) {
            revert AlreadyFinalized();
        }

        euint64 bestPrice = FHE.asEuint64(type(uint64).max);
        euint32 bestBidId = FHE.asEuint32(0);
        ebool hasBest = FHE.asEbool(false);
        euint64 encryptedBudget = FHE.asEuint64(tender.budgetCap);

        for (uint32 i = 1; i <= tender.bidCount; ++i) {
            euint64 candidate = _bids[tenderId][i].price;
            ebool withinBudget = FHE.le(candidate, encryptedBudget);
            ebool lower = FHE.lt(candidate, bestPrice);
            ebool firstValid = FHE.and(FHE.not(hasBest), withinBudget);
            ebool betterValid = FHE.and(hasBest, FHE.and(withinBudget, lower));
            ebool replace = FHE.or(firstValid, betterValid);

            bestPrice = FHE.select(replace, candidate, bestPrice);
            bestBidId = FHE.select(replace, FHE.asEuint32(i), bestBidId);
            hasBest = FHE.or(hasBest, withinBudget);
        }

        TenderPrivate storage tenderPrivate = _tenderPrivate[tenderId];
        tenderPrivate.winningBid = FHE.select(hasBest, bestPrice, FHE.asEuint64(0));
        tenderPrivate.winningBidId = FHE.select(hasBest, bestBidId, FHE.asEuint32(0));

        FHE.allowThis(tenderPrivate.winningBid);
        FHE.allowThis(tenderPrivate.winningBidId);
        FHE.allow(tenderPrivate.winningBid, tender.buyer);
        FHE.makePubliclyDecryptable(tenderPrivate.winningBidId);

        tender.finalized = true;

        emit TenderFinalized(tenderId, tenderPrivate.winningBid, tenderPrivate.winningBidId);
    }

    function recordWinnerFromProof(
        uint256 tenderId,
        bytes calldata abiEncodedClearWinnerBidId,
        bytes calldata decryptionProof
    ) external {
        Tender storage tender = _requireTender(tenderId);
        if (!tender.finalized) {
            revert TenderStillOpen();
        }
        if (tender.winnerRecorded) {
            revert WinnerAlreadyRecorded();
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_tenderPrivate[tenderId].winningBidId);
        FHE.checkSignatures(handles, abiEncodedClearWinnerBidId, decryptionProof);

        uint32 clearBidId = abi.decode(abiEncodedClearWinnerBidId, (uint32));
        if (clearBidId == 0 || clearBidId > tender.bidCount) {
            revert NoWinningSupplier();
        }

        address supplier = _bids[tenderId][clearBidId].supplier;
        if (supplier == address(0)) {
            revert NoWinningSupplier();
        }

        tender.winningSupplier = supplier;
        tender.winnerRecorded = true;

        emit WinnerRecorded(tenderId, clearBidId, supplier);
    }

    function grantAuditorAccess(uint256 tenderId, address auditor) external {
        Tender storage tender = _requireTender(tenderId);
        _requireBuyer(tender);
        if (!tender.finalized) {
            revert TenderStillOpen();
        }
        if (auditor == address(0)) {
            revert ZeroAddress();
        }

        FHE.allow(_tenderPrivate[tenderId].winningBid, auditor);
        emit AuditorAccessGranted(tenderId, auditor);
    }

    function winningBidHandle(uint256 tenderId) external view returns (euint64) {
        _requireTenderView(tenderId);
        return _tenderPrivate[tenderId].winningBid;
    }

    function winningBidIdHandle(uint256 tenderId) external view returns (euint32) {
        _requireTenderView(tenderId);
        return _tenderPrivate[tenderId].winningBidId;
    }

    function getBidSupplier(uint256 tenderId, uint32 bidId) external view returns (address) {
        _requireTenderView(tenderId);
        Bid storage bid = _bids[tenderId][bidId];
        if (!bid.exists) {
            revert NoWinningSupplier();
        }

        return bid.supplier;
    }

    function _requireTender(uint256 tenderId) private view returns (Tender storage tender) {
        tender = tenders[tenderId];
        if (tender.buyer == address(0)) {
            revert InvalidTender();
        }
    }

    function _requireTenderView(uint256 tenderId) private view {
        if (tenders[tenderId].buyer == address(0)) {
            revert InvalidTender();
        }
    }

    function _requireBuyer(Tender storage tender) private view {
        if (msg.sender != tender.buyer) {
            revert NotBuyer();
        }
    }
}
