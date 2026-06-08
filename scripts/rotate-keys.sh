#!/bin/bash
# Script to help rotate API keys if they were accidentally exposed.
# This script is NOT executable by default for safety.
# Run with: bash scripts/rotate-keys.sh

echo "🔐 API Key Rotation Helper"
echo "=========================="
echo ""
echo "This script helps identify environment variables that look like API keys."
echo "If any keys were exposed (e.g., committed to git), rotate them immediately."
echo ""

# List environment variables that look like API keys
echo "Checking current environment for potential API keys..."
echo ""

# Common API key patterns
PATTERNS=("sk_" "gsk_" "gc_" "SECRET_" "KEY_" "TOKEN_" "PASSWORD_" "ACCESS_")

for pattern in "${PATTERNS[@]}"; do
  env | grep -i "$pattern" || true
done

echo ""
echo "📋 Services to check for key rotation:"
echo "--------------------------------------"
echo "1. General Compute"
echo "2. Groq"
echo "3. Moonshot"
echo "4. OpenRouter"
echo "5. Supabase"
echo "6. Midtrans"
echo ""
echo "🛠️  Steps to rotate:"
echo "1. Log into each service's dashboard."
echo "2. Generate new API keys/secrets."
echo "3. Update your .env file with the new values."
echo "4. Deploy the updated environment variables."
echo "5. Revoke the old keys in the service dashboard."
echo ""
echo "⚠️  Important: Always rotate keys immediately if exposed!"