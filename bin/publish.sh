#!/bin/bash

# Run tests
VALID="$(npm test | grep -o 'failing')"

if [[ $VALID = "failing" ]]; then
  echo "ERROR: Cannot publish if tests are failing"
  exit 1
fi

# Build project
npm run build

# Publish
npm publish

# Clean project
npm run clean
