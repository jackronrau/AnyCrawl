#!/bin/sh
set -e

# Set default environment variables if not provided
export ANYCRAWL_API_DB_TYPE=${ANYCRAWL_API_DB_TYPE:-sqlite}
export ANYCRAWL_API_DB_CONNECTION=${ANYCRAWL_API_DB_CONNECTION:-/usr/src/app/storage/anycrawl.db}
export ANYCRAWL_API_PORT=${ANYCRAWL_API_PORT:-8080}
export ANYCRAWL_API_AUTH_ENABLED=${ANYCRAWL_API_AUTH_ENABLED:-false}

# Create storage directory if it doesn't exist
mkdir -p /usr/src/app/storage

echo "Starting API server with database type: $ANYCRAWL_API_DB_TYPE"
echo "Database connection: $ANYCRAWL_API_DB_CONNECTION"
echo "API port: $ANYCRAWL_API_PORT"

# Start the API server
exec node ./dist/index.js 