#!/bin/bash

# Function to check if validator is running
check_validator() {
    # Check if solana-test-validator process is running
    if pgrep -f "solana-test-validator" > /dev/null; then
        echo "✅ Validator is already running"
        return 0
    else
        echo "❌ Validator is not running"
        return 1
    fi
}

# Function to start the validator
start_validator() {
    echo "🚀 Starting validator..."
    ./scripts/test-node.sh
    
    # Wait for validator to be ready
    echo "⏳ Waiting for validator to be ready..."
    sleep 3 
    
    # Additional check to ensure validator is responding
    for i in {1..3}; do
        if curl -s http://127.0.0.1:8899 > /dev/null 2>&1; then
            echo "✅ Validator is ready and responding"
            return 0
        fi
        echo "⏳ Waiting for validator to respond... (attempt $i/3)"
        sleep 2
    done
    
    echo "❌ Validator failed to start properly"
    return 1
}

# Main execution
echo "🔍 Checking if validator is running..."

if check_validator; then
    echo "📋 Running tests with existing validator..."
else
    echo "🔄 Starting validator first..."
    if ! start_validator; then
        echo "❌ Failed to start validator. Exiting."
        exit 1
    fi
fi

echo "🧪 Running anchor tests..."
anchor test --skip-local-validator 