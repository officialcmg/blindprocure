# BlindProcure 3-Minute Demo Script

## Goal

Pitch BlindProcure as a narrow, working procurement workflow:

> A buyer can select the cheapest compliant supplier without exposing losing bid prices.

## Script

### 0:00-0:25 Problem

Public procurement and enterprise sourcing often need competitive pricing, but open bidding leaks supplier strategy. BlindProcure keeps bid prices encrypted while still letting the buyer and public audit that a winner was selected through the contract workflow.

### 0:25-0:50 What It Does

This demo has one workflow. A buyer creates a tender, approves suppliers, and suppliers submit encrypted prices from their own wallets. The smart contract compares those encrypted prices with Zama FHE and selects the lowest bid under the public budget cap.

### 0:50-1:30 Live Workflow

Open `https://blindprocure.vercel.app`.

Show:

- tender metadata is public,
- supplier rows are visible,
- bid prices are redacted,
- wallet roles control available actions.

Create or open `Office laptops Q3`, approve Supplier A, Supplier B, and Supplier C, then show their encrypted bid submissions.

### 1:30-2:10 FHE Selection

After the deadline, click `Finalize encrypted selection`.

Explain:

- the contract does not sort plaintext,
- each comparison is done over encrypted bid values,
- bids above the public budget cap cannot win,
- ties keep the first lowest bid,
- the encrypted winning bid ID is made publicly decryptable,
- the winning price is not made publicly decryptable.

### 2:10-2:40 Reveal And Selective Decryption

Click `Reveal winner identity`. Show the winning supplier address becomes public.

Then click `Decrypt winning price` as the buyer. Show that the buyer can decrypt the winning price. If auditor access is configured, grant the auditor and show the auditor can decrypt only after access is granted.

### 2:40-3:00 Close

BlindProcure does not implement settlement or token movement. That is intentional. The product proves one practical privacy primitive: confidential bid selection for auditable procurement, deployed on Sepolia with a real smart contract and working frontend.

Expected demo result:

- Supplier B wins.
- Buyer decrypts winning price `980`.
- Losing prices stay redacted in the public UI.
