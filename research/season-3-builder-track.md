# Zama Developer Program Mainnet Season 3 - Builder Track Research

Research date: 2026-06-14

## Confirmed Requirements

- Build a functioning confidential dApp using Zama Protocol.
- Include both smart contract code and frontend code.
- Deploy a working demo website.
- Publish a 3-minute real-person video pitch. AI-generated video or voice is not accepted.
- Publish an X thread or article introducing the project.
- Deploy contracts on Sepolia testnet or Ethereum mainnet.
- Submission deadline: 2026-07-07 23:59 AOE.
- Prize pool: 7,000 cUSDT across 5 winners.

## Season 3 Positioning

Zama's Season 3 announcement frames the season around "Composable Privacy." The practical implication: projects should show confidential computation inside workflows that other apps, protocols, or users can compose with, not only isolated examples.

Builder Track wording emphasizes:

- real-world use cases,
- smart contract + frontend,
- clear documentation,
- website demo,
- 3-minute video pitch,
- Sepolia or mainnet deployment.

## Technical Stack Snapshot

Current official hardhat template dependencies include:

- `@fhevm/solidity` around `0.11.x`
- `@zama-fhe/relayer-sdk` around `0.4.x`
- `@fhevm/hardhat-plugin`
- Hardhat 2.x, ethers 6.x, Solidity `^0.8.24`

The basic contract pattern:

- import encrypted types and FHE helpers from `@fhevm/solidity/lib/FHE.sol`
- inherit `SepoliaConfig` from `@fhevm/solidity/config/ZamaConfig.sol`
- accept encrypted user inputs as `externalEuint*` plus `inputProof`
- convert with `FHE.fromExternal(input, inputProof)`
- compute with `FHE.add`, `FHE.sub`, `FHE.select`, comparisons, etc.
- call `FHE.allowThis(ciphertext)` so the contract can keep using the value
- call `FHE.allow(ciphertext, user)` for users who should be allowed to decrypt

## Previous Winner Pattern

Strong Builder Track examples on the Developer Hub cluster around financial and operational use cases:

- confidential wallet / private transfers,
- encrypted prediction markets,
- confidential RWA swaps and compliance,
- private donations,
- contribution circles / vaults,
- confidential games,
- confidential legal agreements,
- confidential payroll and invoicing,
- confidential AMMs, privacy hooks, OTC, and lending.

Pattern: winners usually make a privacy leak painfully obvious, then show how FHE fixes it in a live, understandable flow.

## Opportunity Filters

A winning project should score high on all of these:

- obvious real-world privacy pain,
- clear reason FHE is necessary instead of ordinary encryption or ZK alone,
- demonstrable in 3 minutes,
- not already saturated by previous winners,
- feasible to build, test, deploy, and polish before July 7,
- has a frontend that makes encrypted state legible without leaking it,
- uses Zama-specific primitives deeply enough to prove technical understanding.

## Candidate Ideas

### 1. Confidential RFQ / OTC Auction for Treasury Trades

Organizations request quotes privately; market makers submit encrypted prices and sizes; the contract selects the best valid quote without exposing losing quotes. Winner and settlement can be selectively revealed.

Why it is strong:

- Directly aligned with composable confidential finance.
- Easy 3-minute story: public RFQs leak trade intent; encrypted bids restore competitive pricing.
- FHE is natural for comparing encrypted values.
- Less generic than another prediction market, payroll, donation, or wallet.

Risks:

- Need careful simplification: avoid building a full exchange.
- Settlement token integration can be mocked or use official testnet cTokens if time allows.

### 2. Confidential Credit Allocation / Loan Underwriting

Borrowers submit encrypted income, collateral, or risk signals. The contract computes eligibility and max borrow amount privately, then exposes only pass/fail and approved terms.

Why it is strong:

- Real institutional privacy problem.
- FHE computations are central.
- Frontend can be polished as a serious fintech workflow.

Risks:

- Harder to make composable without offchain data assumptions.
- Prior winners already include lending and compliance-adjacent projects.

### 3. Confidential DAO Contributor Compensation

DAO budget owners create encrypted compensation bands, contributors submit encrypted invoices or salary expectations, and the contract enforces budget caps while hiding individual compensation.

Why it is strong:

- Very understandable demo.
- Clear privacy pain.
- Strong fit for FHE arithmetic over encrypted balances and claims.

Risks:

- Payroll has appeared in previous winning projects, so differentiation must be sharper.

### 4. Confidential Procurement Reverse Auction

A buyer posts a procurement request. Suppliers submit encrypted prices and capacity. The contract computes the lowest valid bid or best scored bid without revealing competitor pricing.

Why it is strong:

- Less crypto-native, very real-world.
- FHE comparison and selection are core.
- Easy to demo with roles: buyer, three suppliers, winner.

Risks:

- Needs a crisp web3 settlement angle to avoid feeling like a Web2 app with encryption attached.

## Recommended Direction

Build a confidential RFQ / OTC auction product.

Working name: **CipherRFQ**

One-line pitch:

> Private onchain RFQs where makers compete on encrypted quotes and traders get best execution without leaking trade intent.

Core demo:

1. A trader opens an RFQ for a token pair and target size.
2. Makers submit encrypted quote price and available size.
3. Contract validates quote size and chooses the best price using FHE comparisons.
4. Losing quotes stay encrypted.
5. The trader can decrypt the winning quote details.
6. The public can verify that the RFQ was settled by contract logic without seeing all private quotes.

Technical substance:

- encrypted quote price,
- encrypted quote size,
- encrypted maker inventory or capacity,
- encrypted comparison / best quote selection,
- selective decryption permissions,
- event trail for public workflow state.

MVP contract surface:

- `createRfq(baseToken, quoteToken, publicMinSize, deadline)`
- `submitQuote(rfqId, encryptedPrice, encryptedSize, inputProof)`
- `selectBestQuote(rfqId)` or incremental best quote during submission
- `finalizeRfq(rfqId)`
- `getEncryptedWinningPrice(rfqId)`
- `getEncryptedWinningSize(rfqId)`
- `allowTraderDecrypt(rfqId)` if needed by flow

Frontend surface:

- trader dashboard,
- maker quote form,
- RFQ timeline,
- encrypted quote table with redacted values,
- winner reveal panel for authorized trader,
- public audit view showing quote count, deadline, status, and winning maker address.

## Build Plan

### Phase 1 - Protocol Understanding

- Clone/use official hardhat template.
- Implement and test the minimal encrypted comparison pattern.
- Confirm frontend encryption and user decryption flow against current relayer SDK.
- Confirm Sepolia config and required env variables.

### Phase 2 - MVP Contract

- Implement `CipherRFQ.sol`.
- Unit test create, submit, compare, finalize, permissions.
- Add invariant-style tests around invalid deadlines, empty RFQs, and tie behavior.
- Deploy to Sepolia.

### Phase 3 - Frontend

- Build a serious single-screen app: RFQ list, create RFQ, submit quote, finalize, decrypt winner.
- Use wallet connection and relayer SDK.
- Make encrypted/redacted states visually clear without adding tutorial text.

### Phase 4 - Product Polish

- Seed demo RFQs.
- Add demo mode copy and transaction state handling.
- Add README with architecture, contract addresses, and demo script.
- Record 3-minute real-person pitch.
- Publish X thread.

## Decision

Unless technical exploration uncovers a blocker, proceed with CipherRFQ.
