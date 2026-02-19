#!/usr/bin/env bash
set -euo pipefail

TARGET_ENVIRONMENT="${1:-}"
if [[ -z "$TARGET_ENVIRONMENT" ]]; then
  echo "Usage: $0 <staging|prod>"
  exit 1
fi

if [[ "$TARGET_ENVIRONMENT" == "staging" ]]; then
  PROJECT_ID="${FIREBASE_PROJECT_ID_STAGING:-}"
elif [[ "$TARGET_ENVIRONMENT" == "prod" ]]; then
  PROJECT_ID="${FIREBASE_PROJECT_ID_PROD:-}"
else
  echo "Unsupported environment: $TARGET_ENVIRONMENT"
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "Missing Firebase project id env var for $TARGET_ENVIRONMENT"
  exit 1
fi

if [[ -z "${FIREBASE_TOKEN:-}" ]]; then
  echo "Missing FIREBASE_TOKEN"
  exit 1
fi

npx firebase-tools deploy \
  --project "$PROJECT_ID" \
  --config firebase.json \
  --only firestore:rules,firestore:indexes,hosting \
  --non-interactive
