#!/bin/bash
# Kill any existing validator processes
pkill -f "solana-test-validator" || true

# Execute the TypeScript file and capture its output
echo "Generating validator command..."
VALIDATOR_CMD=$(npx ts-node scripts/genBashScript.ts | tail -n 1)

# Check if we got a valid command
if [[ $VALIDATOR_CMD == solana-test-validator* ]]; then
    echo "Executing: $VALIDATOR_CMD"
    eval $VALIDATOR_CMD
else
    echo "Error: Failed to generate valid validator command"
    echo "Output was: $VALIDATOR_CMD"
    exit 1
fi
