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

Fill `BUYER_PRIVATE_KEY` locally. The seed script automatically loads `web/.env.demo-local` and `web/.env.demo-wallets` when they exist.

## 3. Seed The Live Demo

```bash
npm run seed:demo --workspace web
```

Expected terminal result:

- tender ID printed,
- three suppliers approved,
- three encrypted bids submitted,
- encrypted selection finalized,
- winner proof recorded,
- winning bid ID is `2`,
- buyer decrypted winning price is `980`,
- demo URL points to `https://blindprocure.vercel.app/tenders/<id>`.

## 4. Verify With Cast

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

## 5. Browser Dry Run

Open `https://blindprocure.vercel.app/tenders/<id>`.

Confirm:

- bid prices are redacted in the public ledger,
- winning supplier is visible,
- losing prices are not displayed,
- buyer can decrypt the winning price,
- auditor can decrypt only after access grant.
