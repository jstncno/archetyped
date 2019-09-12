#!/bin/bash

# Clean and build new project
npm run clean
npm run build

# Build test comopnents
tsc -p tests/tsconfig.json

TEST_SUITES=('calculator' 'node-vm')
for t in "${TEST_SUITES[@]}";
do
  # Copy Calculator and Node VM test suites package files
  copyfiles -E demos/${t}/**/*.json tests/build/

  # Copy new Archetyped build to test suites
  copyfiles -E -u 1 dist/**/* tests/build/demos/${t}/node_modules/archetyped
  copyfiles -E -u 1 dist/* tests/build/demos/${t}/node_modules/archetyped

done

# Run tests
TS_NODE_TRANSPILE_ONLY=true mocha -r ts-node/register -r tsconfig-paths/register tests/**/*.spec.ts

# Cleanup
rm -rf tests/build/ dist/
