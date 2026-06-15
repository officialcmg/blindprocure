# Final Demo Runbook

Use this only on a local machine with ignored env files. Do not commit private keys.

## 1. Generate Supplier Wallets

```bash
npm run demo:wallets --workspace web
```

The command writes `web/.env.demo-wallets` and prints supplier/auditor public addresses.

## 2. Prepare Local Env

Create an ignored local env file such as `web/.env.demo-local`:

```bash
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BLINDPROCURE_ADDRESS=0x3801C32Fc2b61d9De992643825B80809Ac439443
BUYER_PRIVATE_KEY=
FUND_SUPPLIERS=true
DEMO_DEADLINE_SECONDS=90
```

Either fill `BUYER_PRIVATE_KEY` locally or use the hidden runtime prompt. The seed script automatically loads `web/.env.demo-local` and `web/.env.demo-wallets` when they exist.

## 3. Seed The Live Demo

First confirm the hosted app is serving the expected public shell:

```bash
npm run verify:hosted --workspace web
```

Then seed:

```bash
npm run seed:demo --workspace web -- --prompt-buyer-key
```

Expected terminal result:

- tender ID printed,
- `web/.env.demo-result` written with public demo metadata,
- three suppliers approved,
- three encrypted bids submitted,
- encrypted selection finalized,
- winner proof recorded,
- winning bid ID is `2`,
- buyer decrypted winning price is `980`,
- demo URL points to `https://blindprocure.vercel.app/tenders/<id>`.

## 4. Verify Public Contract State

```bash
npm run verify:demo --workspace web
```

The verifier reads `web/.env.demo-result` and checks title, budget cap, bid count, finalized status, recorded winner, and expected Supplier B result.

## 5. Verify With Cast

```bash
cast call 0x3801C32Fc2b61d9De992643825B80809Ac439443 "nextTenderId()(uint256)" --rpc-url "$SEPOLIA_RPC_URL"
cast call 0x3801C32Fc2b61d9De992643825B80809Ac439443 "tenders(uint256)((address,string,bytes32,uint64,uint64,bool,uint32,bool,bool,address))" "$TENDER_ID" --rpc-url "$SEPOLIA_RPC_URL"
```

The tender should show:

- title `Office laptops Q3`,
- budget cap `1500`,
- bid count `3`,
- finalized `true`,
- winner recorded `true`.

## 6. Browser Dry Run

Open `https://blindprocure.vercel.app/tenders/<id>`.

Confirm:

- bid prices are redacted in the public ledger,
- winning supplier is visible,
- losing prices are not displayed,
- buyer can decrypt the winning price,
- auditor can decrypt only after access grant.
