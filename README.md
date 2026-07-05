# BlindProcure

BlindProcure is a Zama FHEVM procurement demo for confidential reverse auctions.

Problem statement:

> A smart contract should be able to choose the cheapest compliant supplier without exposing the losing bids.

Buyers create public tenders. Suppliers submit encrypted bid prices. The contract compares encrypted bids, selects the lowest valid price under the public budget cap, publicly records only the winning supplier, and lets only the buyer or an approved auditor decrypt the winning price.

## Architecture

- `contracts/`: Hardhat + Zama FHEVM contract and tests.
- `web/`: Next.js demo app for the buyer/supplier/auditor workflow.

No settlement is implemented. The demo focuses only on confidential bid selection and selective decryption.

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

## Local Verification

```bash
npm run verify:repo
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm run compile --workspace contracts
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm run test --workspace contracts
npm run lint --workspace web
npm run build --workspace web
```

## Sepolia Deployment

Current deployed contract:

- BlindProcure: `0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5`
- Deployment transaction: `0xf3fc72477e0639396216233c61b7025e76ceee985cd684fe33572141f3d178ad`
- Network: Sepolia
- Hosted demo: `https://blindprocure.vercel.app`

Create a local `.env` from `.env.example` and fill values locally. Do not commit `.env`.

```bash
cd contracts
env HOME=/Users/chrismg/Developer/bounties/zama/.home PRIVATE_KEY=$PRIVATE_KEY SEPOLIA_RPC_URL=$SEPOLIA_RPC_URL npm run deploy:sepolia
```

After deployment, set `NEXT_PUBLIC_BLINDPROCURE_ADDRESS` in `web/.env.local` and in Vercel.

## Sepolia Demo Seeding

Use the seeding script only with local environment variables. Never commit the private keys.

Generate local supplier/auditor wallets:

```bash
npm run demo:wallets --workspace web
```

This writes private keys to ignored file `web/.env.demo-wallets` and prints only public addresses. Add the buyer private key and RPC URL through your shell or another ignored local env file.

Required local env vars:

- `SEPOLIA_RPC_URL`
- `BUYER_PRIVATE_KEY`
- `SUPPLIER_A_PRIVATE_KEY`
- `SUPPLIER_B_PRIVATE_KEY`
- `SUPPLIER_C_PRIVATE_KEY`

Optional local env vars:

- `AUDITOR_PRIVATE_KEY`
- `FUND_SUPPLIERS=true`
- `DEMO_DEADLINE_SECONDS=600`
- `BLINDPROCURE_ADDRESS=0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5`

Run:

```bash
npm run seed:demo --workspace web
```

The script creates `Office laptops Q3`, approves three suppliers, submits three encrypted bids, waits for the deadline, finalizes, publicly records the winning supplier, and decrypts the winning price as the buyer. If `AUDITOR_PRIVATE_KEY` is set, it also grants auditor access and verifies auditor decryption.

## Demo Flow

1. Buyer creates `Office laptops Q3` with budget cap `1500`.
2. Buyer approves three supplier wallets.
3. Supplier A submits encrypted bid `1200`.
4. Supplier B submits encrypted bid `980`.
5. Supplier C submits encrypted bid `1100`.
6. Buyer finalizes encrypted winner selection after deadline.
7. App publicly decrypts only the winning bid ID and records the winning supplier.
8. Buyer decrypts the winning price, `980`.
9. Buyer grants auditor access.
10. Auditor decrypts the same winning price.

Expected result: Supplier B wins, while losing bid prices stay redacted.

## Submission Materials

- Final demo runbook: `docs/final-demo-runbook.md`
- 3-minute video script: `docs/video-script.md`
- X thread draft: `docs/x-thread.md`

## Demo-Readiness Checklist

Verified:

- Contract tests pass.
- Frontend lint and build pass.
- Sepolia contract bytecode exists.
- `cast` can read `nextTenderId`.
- Local app loads `/`, `/demo`, `/tenders`, `/tenders/new`, and `/tenders/[id]`.
- Hosted Vercel app points to the Sepolia contract address.
- Hosted browser checks pass with no console errors on desktop and mobile.
- Missing tender IDs render as not found instead of showing zeroed contract state.

Remaining before recording:

- Seed the live demo tender with `npm run seed:demo --workspace web` after local buyer and supplier private-key env vars are available.
- Re-run `cast` reads for the seeded tender metadata, bid count, finalization status, and winning supplier.
- Browser dry run the full seeded demo path and confirm Supplier B wins with buyer-decrypted price `980`.
