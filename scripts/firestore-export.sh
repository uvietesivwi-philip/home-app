#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Set PROJECT_ID}"
: "${BACKUP_BUCKET:?Set BACKUP_BUCKET like gs://my-backups}"

STAMP="$(date -u +%F-%H%M%S)"

gcloud firestore export "${BACKUP_BUCKET}/${STAMP}" \
  --project="${PROJECT_ID}" \
  --database='(default)'
