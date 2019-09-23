#!/bin/bash

# Exit when any command fails
set -e

# Run tests
npm test

# Build project
npm run build

# Publish
npm publish

# Clean project
npm run clean
