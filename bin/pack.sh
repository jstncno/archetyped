#!/bin/bash

# Exit when any command fails
set -e

# Run tests
npm test

# Build project
npm run build

# Pack
npm pack

# Clean project
npm run clean
