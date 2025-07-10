#!/bin/bash
# Kill any existing validator processes
pkill -f "solana-test-validator" || true

# Start the test validator with mainnet forking
solana-test-validator \
  --url https://api.mainnet-beta.solana.com \
  --clone JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 \
  --clone TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA \
  --clone ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL \
  --clone So11111111111111111111111111111111111111112 \
  --clone EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --bpf-program JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4 ./scripts/jupiter.so \
  --reset
