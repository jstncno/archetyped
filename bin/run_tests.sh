#!/bin/bash

# Exit when any command fails
set -e

# Run linter
npm run test:lint

# Clean and build new project
npm run clean
npm run build

# Build test comopnents
tsc -p tests/tsconfig.json

readonly REL_BASE_DIR="tests/build"
readonly TEST_DIR="${REL_BASE_DIR}/demos"
readonly TEST_SUITES=("tests")
for t in "${TEST_SUITES[@]}";
do
  # Copy Calculator and Node VM test suites package files
  copyfiles -E demos/${t}/**/*.json ${REL_BASE_DIR}

  readonly TEST_SUITE_DIR="${TEST_DIR}/${t}/node_modules/archetyped"

  # Copy new Archetyped build to test suites
  copyfiles -E package.json ${TEST_SUITE_DIR}
  copyfiles -E {archetyped,index}.{d.ts,js} ${TEST_SUITE_DIR}
  copyfiles -E lib/* ${TEST_SUITE_DIR}

done

# Run tests
TS_NODE_TRANSPILE_ONLY=true mocha -r ts-node/register -r tsconfig-paths/register tests/**/*.spec.ts

# Cleanup
npm run clean
