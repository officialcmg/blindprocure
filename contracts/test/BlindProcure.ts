import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { BlindProcure, BlindProcure__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  buyer: HardhatEthersSigner;
  supplierA: HardhatEthersSigner;
  supplierB: HardhatEthersSigner;
  supplierC: HardhatEthersSigner;
  auditor: HardhatEthersSigner;
  outsider: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BlindProcure")) as BlindProcure__factory;
  const blindProcure = (await factory.deploy()) as BlindProcure;
  const blindProcureAddress = await blindProcure.getAddress();

  return { blindProcure, blindProcureAddress };
}

async function futureDeadline(offset = 3600) {
  return Number(await time.latest()) + offset;
}

async function createTender(blindProcure: BlindProcure, buyer: HardhatEthersSigner, budgetCap = 1500) {
  const deadline = await futureDeadline();
  const specHash = ethers.keccak256(ethers.toUtf8Bytes("Office laptops Q3"));
  await (
    await blindProcure.connect(buyer).createTender("Office laptops Q3", specHash, deadline, budgetCap, true)
  ).wait();

  return { tenderId: 1n, deadline, specHash };
}

async function approveDemoSuppliers(blindProcure: BlindProcure, signers: Signers) {
  await (
    await blindProcure
      .connect(signers.buyer)
      .approveSuppliers(1, [signers.supplierA.address, signers.supplierB.address, signers.supplierC.address])
  ).wait();
}

async function encryptBid(contractAddress: string, supplier: HardhatEthersSigner, price: number) {
  return fhevm.createEncryptedInput(contractAddress, supplier.address).add64(price).encrypt();
}

async function submitBid(
  blindProcure: BlindProcure,
  contractAddress: string,
  supplier: HardhatEthersSigner,
  price: number,
) {
  const encrypted = await encryptBid(contractAddress, supplier, price);
  await (await blindProcure.connect(supplier).submitBid(1, encrypted.handles[0], encrypted.inputProof)).wait();
}

async function finalize(blindProcure: BlindProcure, buyer: HardhatEthersSigner, deadline: number) {
  await time.increaseTo(deadline);
  await (await blindProcure.connect(buyer).finalizeTender(1)).wait();
}

async function decryptWinningBid(
  blindProcure: BlindProcure,
  contractAddress: string,
  tenderId: bigint,
  signer: HardhatEthersSigner,
) {
  const winningBidHandle = await blindProcure.winningBidHandle(tenderId);
  return fhevm.userDecryptEuint(FhevmType.euint64, winningBidHandle, contractAddress, signer);
}

describe("BlindProcure", function () {
  let signers: Signers;
  let blindProcure: BlindProcure;
  let blindProcureAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      buyer: ethSigners[1],
      supplierA: ethSigners[2],
      supplierB: ethSigners[3],
      supplierC: ethSigners[4],
      auditor: ethSigners[5],
      outsider: ethSigners[6],
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ blindProcure, blindProcureAddress } = await deployFixture());
  });

  it("creates a tender and rejects past deadlines", async function () {
    const { deadline, specHash } = await createTender(blindProcure, signers.buyer);

    const tender = await blindProcure.tenders(1);
    expect(tender.buyer).to.eq(signers.buyer.address);
    expect(tender.title).to.eq("Office laptops Q3");
    expect(tender.specHash).to.eq(specHash);
    expect(tender.deadline).to.eq(deadline);
    expect(tender.budgetCap).to.eq(1500);
    expect(tender.whitelistEnabled).to.eq(true);

    await expect(
      blindProcure
        .connect(signers.buyer)
        .createTender("Expired", specHash, Number(await time.latest()) - 1, 1500, true),
    ).to.be.revertedWithCustomError(blindProcure, "InvalidDeadline");
  });

  it("selects the lowest encrypted bid under budget and records the public winner from proof", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer);
    await approveDemoSuppliers(blindProcure, signers);

    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1200);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierB, 980);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierC, 1100);

    await finalize(blindProcure, signers.buyer, deadline);

    const winningBidIdHandle = await blindProcure.winningBidIdHandle(1);
    const clearWinningBidId = await fhevm.publicDecryptEuint(FhevmType.euint32, winningBidIdHandle);
    expect(clearWinningBidId).to.eq(2n);

    const publicDecrypt = await fhevm.publicDecrypt([winningBidIdHandle]);
    await (
      await blindProcure.recordWinnerFromProof(
        1,
        publicDecrypt.abiEncodedClearValues,
        publicDecrypt.decryptionProof,
      )
    ).wait();

    const tender = await blindProcure.tenders(1);
    expect(tender.winnerRecorded).to.eq(true);
    expect(tender.winningSupplier).to.eq(signers.supplierB.address);
    expect(await decryptWinningBid(blindProcure, blindProcureAddress, 1n, signers.buyer)).to.eq(980n);
  });

  it("ignores encrypted bids above the public budget cap", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer, 1000);
    await approveDemoSuppliers(blindProcure, signers);

    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1200);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierB, 980);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierC, 1100);

    await finalize(blindProcure, signers.buyer, deadline);

    const winningBidIdHandle = await blindProcure.winningBidIdHandle(1);
    expect(await fhevm.publicDecryptEuint(FhevmType.euint32, winningBidIdHandle)).to.eq(2n);
    expect(await decryptWinningBid(blindProcure, blindProcureAddress, 1n, signers.buyer)).to.eq(980n);
  });

  it("uses a zero encrypted winner id when no bids are within budget", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer, 900);
    await approveDemoSuppliers(blindProcure, signers);

    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1200);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierB, 980);

    await finalize(blindProcure, signers.buyer, deadline);

    const winningBidIdHandle = await blindProcure.winningBidIdHandle(1);
    const publicDecrypt = await fhevm.publicDecrypt([winningBidIdHandle]);
    expect(await fhevm.publicDecryptEuint(FhevmType.euint32, winningBidIdHandle)).to.eq(0n);

    await expect(
      blindProcure.recordWinnerFromProof(1, publicDecrypt.abiEncodedClearValues, publicDecrypt.decryptionProof),
    ).to.be.revertedWithCustomError(blindProcure, "NoWinningSupplier");
  });

  it("keeps the first supplier on equal-price ties", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer);
    await approveDemoSuppliers(blindProcure, signers);

    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 980);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierB, 980);

    await finalize(blindProcure, signers.buyer, deadline);

    const winningBidIdHandle = await blindProcure.winningBidIdHandle(1);
    expect(await fhevm.publicDecryptEuint(FhevmType.euint32, winningBidIdHandle)).to.eq(1n);
  });

  it("enforces supplier approvals, duplicate bid prevention, and frozen whitelists", async function () {
    await createTender(blindProcure, signers.buyer);
    await (await blindProcure.connect(signers.buyer).approveSupplier(1, signers.supplierA.address)).wait();

    await expect(
      submitBid(blindProcure, blindProcureAddress, signers.supplierB, 1000),
    ).to.be.revertedWithCustomError(blindProcure, "SupplierNotApproved");

    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1000);

    await expect(
      submitBid(blindProcure, blindProcureAddress, signers.supplierA, 990),
    ).to.be.revertedWithCustomError(blindProcure, "DuplicateBid");

    await expect(
      blindProcure.connect(signers.buyer).approveSupplier(1, signers.supplierB.address),
    ).to.be.revertedWithCustomError(blindProcure, "WhitelistFrozen");
  });

  it("enforces buyer-only finalization, deadline rules, and auditor access", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer);
    await approveDemoSuppliers(blindProcure, signers);
    await submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1000);

    await expect(blindProcure.connect(signers.outsider).finalizeTender(1)).to.be.revertedWithCustomError(
      blindProcure,
      "NotBuyer",
    );
    await expect(blindProcure.connect(signers.buyer).finalizeTender(1)).to.be.revertedWithCustomError(
      blindProcure,
      "TenderStillOpen",
    );

    await finalize(blindProcure, signers.buyer, deadline);

    await expect(decryptWinningBid(blindProcure, blindProcureAddress, 1n, signers.outsider)).to.be.rejected;
    await expect(decryptWinningBid(blindProcure, blindProcureAddress, 1n, signers.auditor)).to.be.rejected;

    await (await blindProcure.connect(signers.buyer).grantAuditorAccess(1, signers.auditor.address)).wait();
    expect(await decryptWinningBid(blindProcure, blindProcureAddress, 1n, signers.auditor)).to.eq(1000n);
  });

  it("rejects late bids", async function () {
    const { deadline } = await createTender(blindProcure, signers.buyer);
    await (await blindProcure.connect(signers.buyer).approveSupplier(1, signers.supplierA.address)).wait();

    await time.increaseTo(deadline);
    await expect(
      submitBid(blindProcure, blindProcureAddress, signers.supplierA, 1000),
    ).to.be.revertedWithCustomError(blindProcure, "TenderClosed");
  });
});
