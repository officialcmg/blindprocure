# BlindProcure

**Verifiable onchain procurement without price leakage.**

BlindProcure is a confidential sealed-bid tender app built on Zama FHEVM. It lets buyers publish procurement rules onchain, lets approved suppliers submit encrypted prices, and lets the contract select the lowest valid offer without exposing supplier pricing to competitors.

Public blockchains make procurement awards independently checkable, but normal public execution leaks every bid the moment it is submitted. That is unacceptable for real procurement: suppliers need their pricing strategy protected, and buyers still need the award to be auditable.

BlindProcure resolves that trade-off with Fully Homomorphic Encryption (FHE). Suppliers encrypt prices in the browser. The smart contract compares ciphertexts, enforces the public budget cap, and records the winning supplier through proof-backed public decryption. Losing prices remain encrypted, and the winning price is decryptable only by the buyer or an approved auditor.

The result is a procurement workflow with public rules, verifiable awards, and confidential supplier pricing.

- **Live app:** https://blindprocure.xyz
- **Repository:** https://github.com/officialcmg/blindprocure
- **Network:** Ethereum Sepolia testnet

## Contents

- [Architecture](#architecture)
- [Privacy model](#privacy-model)
- [Composable privacy](#composable-privacy)
- [App routes](#app-routes)
- [Using the app](#using-the-app)
- [A known browser limitation](#a-known-browser-limitation)
- [Local development](#local-development)
- [Local verification](#local-verification)
- [Sepolia deployment](#sepolia-deployment)
- [Additional verification scripts](#additional-verification-scripts)

## Architecture

- `contracts/`: Hardhat + Zama FHEVM contract (`BlindProcure.sol`) and tests.
- `web/`: Next.js app for the buyer/supplier/auditor workflow, with Privy-powered sponsored smart accounts.

No settlement is implemented. The app focuses only on confidential bid selection and selective decryption.

## Privacy model

Public:

- buyer and supplier addresses,
- tender title and spec hash,
- deadline and public budget cap,
- bid count and submission timing,
- winning supplier after proof-verified public winner reveal.

Confidential:

- supplier bid prices,
- winning price unless decrypted by the buyer or an approved auditor.

There is no draft or hidden state in between: a tender's metadata is public the instant it's created, and every bid price is unreadable ciphertext from the instant it's submitted until the contract is explicitly told who may decrypt it.

## Composable privacy

Public blockchains solve a specific problem: **verifiability**. Anyone can check that a transaction executed correctly and that the resulting state is correct, without trusting an operator. That is the entire reason to put procurement onchain instead of in a spreadsheet - a buyer can't quietly favor a supplier, and a supplier can't dispute that the rules were followed.

The catch is that public verifiability has always meant public *data*. To let everyone check that a transaction was correct, blockchains have historically had to show everyone the transaction itself. For procurement, that trade-off was never acceptable: a verifiable tender that leaks every bidder's price to every competitor isn't a feature, it's a business risk. This is precisely the dilemma Zama calls "the blockchain confidentiality dilemma" in its [protocol litepaper](https://docs.zama.ai/protocol/zama-protocol-litepaper): *"One major issue with public verifiability however is that it requires disclosing all the transactions and data to everyone, as keeping them private would prevent verifiability in the first place."*

Zama's Confidential Blockchain Protocol resolves that trade-off with **Fully Homomorphic Encryption (FHE)**: a smart contract can compute directly on ciphertext - compare it, select the minimum of it, brand it as a winner - without ever decrypting it. BlindProcure's `finalizeTender()` is a direct example: it runs a homomorphic `min()` over every encrypted bid and picks the lowest one under the budget cap, and at no point does the contract, the coprocessors evaluating it, or the buyer see a losing price.

Zama's 2026 developer season frames this capability as **"Composable Privacy,"** and the litepaper is explicit about why the word "composable" matters here, not just "private": *"Composability between confidential contracts, as well as with non-confidential ones. Developers can build on top of other contracts, tokens and dapps."* A confidential dApp that can only ever talk to itself isn't very useful - the point is that encrypted state on the Zama Protocol behaves like a normal, first-class piece of onchain state that other contracts, oracles, and applications can reason about and build on, even though they can't read it. In BlindProcure's case, that shows up in a few concrete ways:

- **Per-value access control, not per-app.** Every ciphertext (a bid price, the winning price, the winning bid ID) carries its own [Access Control List](https://docs.zama.ai/protocol) entry. `FHE.allow(...)` and `FHE.allowThis(...)` calls in the contract decide, value by value, who can ever decrypt it - the bidder who submitted it, the contract itself for later computation, the buyer once finalized, an auditor the buyer explicitly grants access to later. That access model isn't bolted onto the frontend; it's enforced by the protocol's Gateway and KMS regardless of which app or account is asking.
- **A ciphertext that outlives the app that created it.** `grantAuditorAccess()` doesn't copy the winning price anywhere or send it through a side channel - it extends the *same* onchain ACL entry to a new address. Any future contract, auditor tool, or compliance workflow that already has Zama Protocol access can be handed the same right, without BlindProcure ever needing to know that workflow exists.
- **Public proof without public data.** `recordWinnerFromProof()` takes a KMS-issued decryption proof and lets *anyone* - not just the buyer - verify and record the winner onchain. The verifiability blockchains promise is fully intact; only the input that produced the result stays sealed.

This is also why the architecture leans on Privy smart accounts and a sponsored-gas flow rather than requiring suppliers to hold ETH or manage a seed phrase: composability is only meaningful if ordinary users can actually reach the confidential contract in the first place.

## App routes

- `/` — landing page explaining the problem, workflow, and privacy model.
- `/app` (alias `/app/tenders`) — authenticated workspace: all tenders, and tenders created by the signed-in account.
- `/app/tenders/new` — create a tender.
- `/app/tenders/[id]` — tender detail: approve suppliers, submit encrypted bids, finalize, reveal the winner, and decrypt the winning price.
- `/encrypt-bid` — isolated helper window used internally to encrypt bid prices locally under cross-origin isolation. Not meant to be visited directly. See [A known browser limitation](#a-known-browser-limitation).

## Using the app

1. A buyer signs in with email or Google (Privy sponsors gas, no wallet setup needed) and creates a tender with a title, spec, budget cap, and bidding deadline.
2. The buyer approves suppliers, either by wallet address or by email (resolved to a Privy smart-wallet address server-side). Approvals lock the moment the first bid arrives.
3. Each approved supplier signs in, enters a bid price, and submits it. The price is encrypted in the browser with Zama FHE before it ever leaves the device.
4. After the deadline, the buyer finalizes the tender. The contract compares the encrypted bids and selects the lowest valid one without ever decrypting a losing price. If no bid was submitted, or every bid exceeded the budget cap, the tender finalizes with no winner - this is a real, permanent outcome the UI surfaces directly.
5. Anyone can reveal the winning supplier identity, backed by a public decryption proof.
6. The buyer (or an auditor the buyer explicitly grants access to) can privately decrypt the winning price. Losing prices are never decrypted or exposed.

## A known browser limitation

Encrypting a bid price runs Zama's WASM encryption module in your browser. That module requires a `SharedArrayBuffer`, which browsers only grant to a page that is [**cross-origin isolated**](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated) - a stricter security mode browsers introduced after the 2018 Spectre disclosure, which showed that shared memory in an ordinary webpage could be abused for side-channel [cross-site leaks](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XS-Leaks).

The main app can't run in that isolated mode: Privy's login and smart-account flows need popups and iframes, and the [`Cross-Origin-Embedder-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy) header that isolation requires would block exactly those cross-origin connections. So when you submit a bid, BlindProcure briefly opens `/encrypt-bid` - a small popup that *is* served with the required [`Cross-Origin-Opener-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy), `Cross-Origin-Embedder-Policy`, and [`Permissions-Policy: cross-origin-isolated`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/cross-origin-isolated) headers. It encrypts the price locally, hands the ciphertext back to the main window over a [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel), and closes itself. Your plaintext price never leaves that popup.

Chrome and Edge grant this isolation to a popup reliably. Some Firefox and Safari configurations - most commonly private/incognito windows, which disable `SharedArrayBuffer` outright as an anti-fingerprinting measure - don't. If that happens, the popup now detects it immediately (via `window.crossOriginIsolated`) and fails fast with an explanation, instead of silently hanging until Zama's SDK worker times out on its own 60-second [`INIT`](https://github.com/zama-ai/relayer-sdk) handshake. If you hit this, use a normal (non-private) Chrome or Edge window.

## Local development

```bash
npm install
cp .env.example web/.env.local   # fill in Privy and contract values
npm run dev
```

## Local verification

```bash
npm run verify:repo
npm run compile:contracts
npm run test
npm run lint --workspace web
npm run build
```

## Sepolia deployment

Current deployed contract:

- BlindProcure: `0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5`
- Network: Sepolia
- Hosted app: `https://blindprocure.xyz`

Create a local `.env` from `.env.example` and fill values locally. Do not commit `.env`.

```bash
cd contracts
PRIVATE_KEY=$PRIVATE_KEY SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL npm run deploy:sepolia
```

After deployment, set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` in `web/.env.local` and in Vercel.

## Additional verification scripts

These live in `web/scripts/` and check real invariants of the production integration:

- `npm run verify:privy-integration --workspace web` — static checks that login stays restricted to email/Google, writes go through the Privy smart-account client, and decryption uses Zama's delegated EIP-712 flow.
- `npm run verify:smart-account-decryption --workspace web` — live Sepolia check that delegated user-decryption works when the ACL principal is a smart account. Requires `SEPOLIA_RPC_URL` and `SMART_ACCOUNT_TEST_PRIVATE_KEY` (or `SUPPLIER_A_PRIVATE_KEY`) in an ignored local env file.
- `npm run verify:hosted --workspace web` — headless-browser check that the hosted deployment renders the landing page, workspace, and create-tender form with no console errors and a configured contract address.
