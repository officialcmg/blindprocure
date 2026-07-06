# BlindProcure

BlindProcure is a confidential sealed-bid procurement app built on Zama's FHEVM.

Problem statement:

> A smart contract should be able to choose the cheapest compliant supplier without exposing the losing bids.

Buyers create public tenders. Suppliers submit encrypted bid prices. The contract compares encrypted bids, selects the lowest valid price under the public budget cap, publicly records only the winning supplier, and lets only the buyer or an approved auditor decrypt the winning price.

## Architecture

- `contracts/`: Hardhat + Zama FHEVM contract and tests.
- `web/`: Next.js app for the buyer/supplier/auditor workflow, with Privy-powered sponsored smart accounts.

No settlement is implemented. The app focuses only on confidential bid selection and selective decryption.

## Privacy Model

Public:

- buyer and supplier addresses,
- tender title and spec hash,
- deadline and public budget cap,
- bid count and submission timing,
- winning supplier after proof-verified public winner reveal.

Confidential:

- supplier bid prices,
- winning price unless decrypted by the buyer or an approved auditor.

## App Routes

- `/` — landing page explaining the problem, workflow, and privacy model.
- `/app` (alias `/app/tenders`) — authenticated workspace: all tenders, and tenders created by the signed-in account.
- `/app/tenders/new` — create a tender.
- `/app/tenders/[id]` — tender detail: approve suppliers, submit encrypted bids, finalize, reveal the winner, and decrypt the winning price.
- `/encrypt-bid` — isolated helper window used internally to encrypt bid prices locally under cross-origin isolation. Not meant to be visited directly.

## Using The App

1. A buyer signs in with email or Google (Privy sponsors gas, no wallet setup needed) and creates a tender with a title, spec, budget cap, and bidding deadline.
2. The buyer approves suppliers, either by wallet address or by email (resolved to a Privy smart-wallet address server-side).
3. Each approved supplier signs in, enters a bid price, and submits it. The price is encrypted in the browser with Zama FHE before it ever leaves the device.
4. After the deadline, the buyer finalizes the tender. The contract compares the encrypted bids and selects the lowest valid one without ever decrypting a losing price.
5. Anyone can reveal the winning supplier identity, backed by a public decryption proof.
6. The buyer (or an auditor the buyer explicitly grants access to) can privately decrypt the winning price. Losing prices are never decrypted or exposed.

## Local Development

```bash
npm install
cp .env.example web/.env.local   # fill in Privy and contract values
npm run dev
```

## Local Verification

```bash
npm run verify:repo
npm run compile:contracts
npm run test
npm run lint --workspace web
npm run build
```

## Sepolia Deployment

Current deployed contract:

- BlindProcure: `0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5`
- Network: Sepolia
- Hosted app: `https://blindprocure.vercel.app`

Create a local `.env` from `.env.example` and fill values locally. Do not commit `.env`.

```bash
cd contracts
PRIVATE_KEY=$PRIVATE_KEY SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL npm run deploy:sepolia
```

After deployment, set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` in `web/.env.local` and in Vercel.

## Additional Verification Scripts

These live in `web/scripts/` and check real invariants of the production integration (not seeded demo data):

- `npm run verify:privy-integration --workspace web` — static checks that login stays restricted to email/Google, writes go through the Privy smart-account client, and decryption uses Zama's delegated EIP-712 flow.
- `npm run verify:smart-account-decryption --workspace web` — live Sepolia check that delegated user-decryption works when the ACL principal is a smart account. Requires `SEPOLIA_RPC_URL` and `SMART_ACCOUNT_TEST_PRIVATE_KEY` (or `SUPPLIER_A_PRIVATE_KEY`) in an ignored local env file.
- `npm run verify:hosted --workspace web` — headless-browser check that the hosted deployment renders the landing page, workspace, and create-tender form with no console errors and a configured contract address.
