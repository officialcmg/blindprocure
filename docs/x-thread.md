# BlindProcure X Thread Draft

1. Introducing BlindProcure: confidential bid selection for procurement, built with Zama FHEVM on Sepolia.

2. The problem is simple. Buyers need the lowest compliant bid. Suppliers do not want to expose pricing strategy. Public blockchains make that tension worse if bids are plaintext.

3. BlindProcure lets a buyer create a public tender with title, deadline, spec hash, and budget cap. Suppliers submit encrypted bid prices from their own wallets.

4. The contract compares encrypted prices using Zama FHE. It selects the lowest encrypted bid under the public budget cap without exposing losing bid prices.

5. The public can see tender metadata, bid count, supplier addresses, finalization status, and the winning supplier after reveal.

6. The public cannot see any bid price. The winning price can only be decrypted by the buyer or by an auditor after the buyer grants access.

7. The workflow is intentionally narrow:
   create tender -> approve suppliers -> submit encrypted bids -> finalize -> reveal winner -> decrypt winning price.

8. No settlement, no token transfer, no broad marketplace. The demo focuses on one privacy primitive that procurement teams can understand quickly.

9. Demo tender:
   Office laptops Q3
   Budget cap: 1500
   Supplier A: encrypted bid
   Supplier B: encrypted bid
   Supplier C: encrypted bid

10. Expected result: Supplier B wins, and only the authorized buyer/auditor can decrypt the winning price.

11. Live app: https://blindprocure.vercel.app

12. Contract: 0x3801C32Fc2b61d9De992643825B80809Ac439443 on Sepolia

13. Built for the Zama Developer Program Builder Track. The goal: make confidential procurement easy to demo, easy to audit, and hard to misunderstand.
