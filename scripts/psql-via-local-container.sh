#!/bin/sh
# Use the already-provisioned local PostgreSQL client; credentials remain in environment.
exec docker --context colima-parkmel-tests exec -i \
 -e PGHOST -e PGPORT -e PGUSER -e PGPASSWORD -e PGDATABASE \
 -e PGSSLMODE -e PGCONNECT_TIMEOUT parkmel-testdb psql "$@"
