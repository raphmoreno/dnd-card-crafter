# D1 Database Setup Guide

This guide explains how to set up the D1 database for storing monster data from Open5e.

## Overview

The D1 database stores all monster data locally in Cloudflare, eliminating the need for each user to download the full monster list from Open5e. This improves performance and reduces API calls.

## Step 1: Create D1 Database

```bash
# Create production database
wrangler d1 create monsters-db

# Create preview database (for testing)
wrangler d1 create monsters-db --preview
```

**Important**: Copy the `database_id` and `preview_database_id` from the output. You'll need these for `wrangler.toml`.

## Step 2: Update wrangler.toml

Edit `wrangler.toml` and update the D1 database IDs:

```toml
[[d1_databases]]
binding = "MONSTERS_DB"
database_name = "monsters-db"
database_id = "your-actual-database-id-here"
preview_database_id = "your-actual-preview-database-id-here"
```

## Step 3: Create Database Schema

Run the schema migration to create the tables:

```bash
# For production (remote)
wrangler d1 execute MONSTERS_DB --remote --file=./cloudflare/schema.sql

# For local development
wrangler d1 execute MONSTERS_DB --local --file=./cloudflare/schema.sql
```

## Step 4: Populate Database

Run the population script to fetch all monsters from Open5e and insert them into D1:

```bash
# For production (remote)
node scripts/populate-d1-database.js

# For local development
node scripts/populate-d1-database.js --local
```

This script will:
1. Fetch all monsters from the Open5e API (may take a few minutes)
2. Insert them into the D1 database in batches
3. Update the full-text search index

**Note**: The first run may take 5-10 minutes depending on the number of monsters.

## Step 5: Verify Setup

Test that the database is working:

```bash
# Query the database
wrangler d1 execute MONSTERS_DB --remote --command="SELECT COUNT(*) as count FROM monsters;"

# Search for a specific monster
wrangler d1 execute MONSTERS_DB --remote --command="SELECT name, type FROM monsters WHERE name LIKE '%goblin%' LIMIT 5;"
```

## Step 6: Deploy Worker

Deploy the updated worker:

```bash
wrangler deploy
```

## Updating Monster Data

To refresh the monster data from Open5e:

1. **Clear existing data** (optional, but recommended for clean refresh):
   ```bash
   wrangler d1 execute MONSTERS_DB --remote --command="DELETE FROM monsters;"
   wrangler d1 execute MONSTERS_DB --remote --command="DELETE FROM monsters_fts;"
   ```

2. **Re-run the population script**:
   ```bash
   node scripts/populate-d1-database.js
   ```

## Database Schema

The database has two main tables:

### `monsters` table
Stores all monster data with columns matching the Open5e API structure. JSON fields (actions, skills, etc.) are stored as JSON strings.

### `monsters_fts` table
Full-text search index for fast searching across monster names, types, subtypes, and alignments.

## Troubleshooting

### Database not found error
- Verify the database IDs in `wrangler.toml` are correct
- Make sure you've created the database with `wrangler d1 create`

### Population script fails
- Check your internet connection (script fetches from Open5e)
- Verify the database schema was created successfully
- Check wrangler logs: `wrangler tail`

### Search not working
- Make sure the FTS index was updated: `wrangler d1 execute MONSTERS_DB --remote --command="SELECT COUNT(*) FROM monsters_fts;"`
- If FTS fails, the worker falls back to LIKE queries

### Performance issues
- D1 queries are fast, but large result sets (>1000) may be slow
- Consider adding pagination if needed
- The worker uses a limit of 500 monsters per query by default

## Cost Considerations

D1 Database pricing (as of 2024):
- **Free tier**: 5 GB storage, 5M reads/month, 100K writes/month
- **Paid**: $0.001/GB storage, $0.001/million reads, $1.00/million writes

For most use cases, the free tier should be sufficient. Monster data is read-heavy and rarely updated.

## Maintenance

### Regular Updates
Consider setting up a scheduled task (Cron Trigger) to refresh monster data monthly:

```toml
# In wrangler.toml
[triggers]
crons = ["0 0 1 * *"]  # First day of each month at midnight
```

Then add a cron handler in `worker.js` to refresh the database.

### Monitoring
Monitor database usage in the Cloudflare dashboard:
- Workers & Pages → D1 → Your database → Metrics

