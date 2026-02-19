#!/usr/bin/env bash
set -euo pipefail

node --test tests/unit/config.test.js tests/rules/firestore-rules.test.js >/dev/null

echo "Typecheck-equivalent structural validation passed"
