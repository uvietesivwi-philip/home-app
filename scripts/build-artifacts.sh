#!/usr/bin/env bash
set -euo pipefail

rm -rf dist
mkdir -p dist

cp -R web dist/web
cp firebase.json firestore.rules firestore.indexes.json dist/

tar -czf dist/home-app-release.tgz -C dist web firebase.json firestore.rules firestore.indexes.json

echo "Built dist/home-app-release.tgz"
