#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "  Applying Database Migration for Multiple Device Support"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Read the migration file
MIGRATION_FILE="supabase/migrations/20260123000001_allow_multiple_device_subscriptions.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "📄 Migration file found: $MIGRATION_FILE"
echo ""
echo "🔗 Opening Supabase SQL Editor..."
echo ""

# Open Supabase SQL Editor
open "https://supabase.com/dashboard/project/ppdyqmpwwyudghsspaao/sql/new"

echo "═══════════════════════════════════════════════════════════════"
echo "  INSTRUCTIONS:"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "1. Copy the SQL below:"
echo ""
cat "$MIGRATION_FILE"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "2. Paste it into the Supabase SQL Editor (opened in browser)"
echo "3. Click 'Run' to apply the migration"
echo "4. You should see 'Success. No rows returned'"
echo ""
echo "This will allow multiple devices per user to receive notifications!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
