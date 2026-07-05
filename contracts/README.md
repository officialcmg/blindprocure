# BlindProcure Contracts

BlindProcure is a confidential procurement reverse auction built with Zama FHEVM. Buyers create public tenders, suppliers submit encrypted prices, and the contract privately selects the lowest valid bid without revealing losing prices.

## Privacy Model

Public by design:

- buyer and supplier addresses,
- tender title and spec hash,
- deadline and public budget cap,
- bid count and submission timing,
- winning supplier after proof-verified winner reveal.

Confidential:

- all supplier bid prices,
- winning price unless the buyer or an authorized auditor decrypts it.

The contract publicly decrypts only the encrypted winning bid ID. It never makes the winning price publicly decryptable.

## Current Contract

`contracts/BlindProcure.sol`

Implemented:

- tender creation,
- optional supplier whitelist,
- one encrypted price bid per supplier,
- max 16 bids per tender,
- encrypted budget filtering,
- encrypted lowest-bid selection with `FHE.select`,
- encrypted winning bid ID with `0` sentinel for no valid bid,
- proof-verified public winner recording,
- buyer-only winning price decryption permission,
- buyer-granted auditor access.

Not implemented:

- token settlement,
- procurement document storage,
- multi-attribute scoring,
- supplier reputation,
- dispute resolution.

## Setup

```bash
npm install
```

Hardhat writes global config by default on macOS. In this workspace, run commands with `HOME` pointed to a local folder:

```bash
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm run compile
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm test
```

## Deploy

Current Sepolia deployment:

- BlindProcure: `0x81C6Eb008787999112D2dD58dB3cbAdE4848F9c5`
- Deployment transaction: `0xf3fc72477e0639396216233c61b7025e76ceee985cd684fe33572141f3d178ad`

Set Hardhat vars before Sepolia deployment:

```bash
env HOME=/Users/chrismg/Developer/bounties/zama/.home npx hardhat vars set PRIVATE_KEY
env HOME=/Users/chrismg/Developer/bounties/zama/.home npx hardhat vars set SEPOLIA_RPC_URL
env HOME=/Users/chrismg/Developer/bounties/zama/.home npx hardhat vars set MNEMONIC
env HOME=/Users/chrismg/Developer/bounties/zama/.home npx hardhat vars set INFURA_API_KEY
env HOME=/Users/chrismg/Developer/bounties/zama/.home npx hardhat vars set ETHERSCAN_API_KEY
```

`PRIVATE_KEY` and `SEPOLIA_RPC_URL` can also be provided as environment variables. Never commit private keys or `.env` files.

Deploy:

```bash
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm run deploy:sepolia
```

## Test

```bash
env HOME=/Users/chrismg/Developer/bounties/zama/.home npm test
```

The mock FHE tests verify encrypted winner selection, budget filtering, tie behavior, access control, public winner recording, auditor access, duplicate bid prevention, and deadline rules.
