#!/usr/bin/env bash
# Dump application data (rows only) from the public schema to a timestamped SQL file.
# Schema DDL is owned by Prisma migrations and is NOT included in this dump.
#
# Usage:   ./scripts/backup-db.sh
# Output:  backups/clickstudio-YYYY-MM-DD-HHMM.sql
#
# Restore into a fresh DB:
#   1. Point DATABASE_URL / DIRECT_URL at the target DB
#   2. npx prisma migrate deploy          # creates tables
#   3. psql "$TARGET_DIRECT_URL" < backups/clickstudio-YYYY-MM-DD-HHMM.sql
#
# The dump contains real user data (emails, hashed passwords, sessions,
# project content). Do not commit, share, or upload to broadly-accessible storage.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "error: .env not found at $ROOT/.env" >&2
  exit 1
fi

# DIRECT_URL bypasses PgBouncer — pg_dump needs a session-level connection.
# Parse .env directly instead of sourcing, so CRLF line endings and unusual
# characters in secrets don't trip the shell.
DIRECT_URL=$(
  grep -E '^DIRECT_URL=' .env \
    | head -n1 \
    | sed -E 's/^DIRECT_URL=//' \
    | tr -d '\r' \
    | sed -E 's/^"(.*)"$/\1/' \
    | sed -E "s/^'(.*)'\$/\\1/"
)
if [[ -z "$DIRECT_URL" ]]; then
  echo "error: DIRECT_URL not set in .env" >&2
  exit 1
fi

# Extract the Prisma `schema=` param from the URL; default to `public`.
SCHEMA=$(echo "$DIRECT_URL" | grep -oE 'schema=[^&[:space:]]+' | head -n1 | sed 's/^schema=//' | tr -d '[:space:]')
SCHEMA="${SCHEMA:-public}"

# libpq (used by pg_dump) rejects Prisma-specific URL params. Strip them.
PG_URL="$DIRECT_URL"
for param in schema connection_limit pool_timeout pgbouncer socket_timeout statement_cache_size; do
  PG_URL=$(echo "$PG_URL" | sed -E "s/([?&])${param}=[^&]*&?/\\1/")
done
PG_URL=$(echo "$PG_URL" | sed -E 's/[?&]$//')

mkdir -p backups
TS=$(date +%Y-%m-%d-%H%M)
OUT="backups/clickstudio-$TS.sql"

echo "Dumping data (rows only) from schema '$SCHEMA' to $OUT ..."
pg_dump "$PG_URL" \
  --data-only \
  --schema="$SCHEMA" \
  --exclude-table="$SCHEMA._prisma_migrations" \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  --file "$OUT"

SIZE=$(du -h "$OUT" | cut -f1)
echo "Done. $OUT ($SIZE)"
echo
echo "Restore into a fresh DB (with DIRECT_URL pointed at the target):"
echo "  npx prisma migrate deploy"
echo "  psql \"\$DIRECT_URL\" < $OUT"
