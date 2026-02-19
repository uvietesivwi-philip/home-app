#!/usr/bin/env bash
set -euo pipefail

JS_FILES=$(rg --files web/js tests -g '*.js')

for file in $JS_FILES; do
  node --check "$file"
done

echo "Lint (syntax) passed for JavaScript files"
