#!/bin/sh
set -e

MIGRATE_DATABASE=false
FIRST_TIME_MIGRATION="FIRST_TIME_MIGRATION_$NODE_ENV"
if [[ ! -e /usr/src/app/$FIRST_TIME_MIGRATION ]] || [[ $MIGRATE_DATABASE = true ]]; then
    # Place your script that you only want to run on first startup.
    echo "Initialize database first time only"
    touch /usr/src/app/$FIRST_TIME_MIGRATION
    pnpm drizzle-kit migrate & PID=$!
    # Wait for migration to finish
    wait $PID
fi

echo "Starting $NODE_ENV server..."

# Check if it's development mode
if [ "$NODE_ENV" = "development" ]; then
    echo "Starting development server..."
    exec pnpm dev
else
    echo "Starting production server..."
    exec node ./dist/index.js
fi

