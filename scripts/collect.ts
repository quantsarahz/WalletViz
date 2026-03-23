/**
 * WalletViz Data Collector
 *
 * Usage:
 *   npx tsx scripts/collect.ts full     # Full scan: all ~8700 events
 *   npx tsx scripts/collect.ts update   # Incremental: top 500 events
 *   npx tsx scripts/collect.ts purge    # Remove trades older than 35 days
 */

import Database from "better-sqlite3";
import path from "path";

const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";
const PROJECT_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DB_PATH = path.join(PROJECT_ROOT, "data", "walletviz.db");
const CONCURRENCY = 10;
const TRADES_PER_EVENT = 1000;
const PURGE_DAYS = 35; // keep 35 days to have full 30-day window

// --- DB Setup ---

function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      proxy_wallet TEXT NOT NULL,
      side TEXT NOT NULL,
      size REAL NOT NULL,
      price REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      condition_id TEXT NOT NULL,
      event_id INTEGER,
      title TEXT,
      UNIQUE(proxy_wallet, timestamp, condition_id, side, size)
    );
    CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades(timestamp);
    CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(proxy_wallet);
    CREATE INDEX IF NOT EXISTS idx_trades_event ON trades(event_id);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      events_scanned INTEGER NOT NULL,
      trades_inserted INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );
  `);

  return db;
}

// --- Fetch helpers ---

async function fetchJson(url: string, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limited — wait and retry
        const wait = Math.pow(2, i + 1) * 1000;
        console.log(`  Rate limited, waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function fetchAllEventIds(): Promise<number[]> {
  const ids: number[] = [];
  let offset = 0;
  const batchSize = 50;

  while (true) {
    const events = await fetchJson(
      `${GAMMA_API}/events?limit=${batchSize}&active=true&closed=false&order=volume&ascending=false&offset=${offset}`
    );
    if (!events || events.length === 0) break;
    ids.push(...events.map((e: any) => e.id));
    if (events.length < batchSize) break;
    offset += batchSize;
    // Small delay to avoid hitting gamma API limits
    if (offset % 200 === 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return ids;
}

async function fetchTopEventIds(count: number): Promise<number[]> {
  const events = await fetchJson(
    `${GAMMA_API}/events?limit=${count}&active=true&closed=false&order=volume&ascending=false`
  );
  return events.map((e: any) => e.id);
}

interface RawTrade {
  proxyWallet: string;
  side: string;
  size: string;
  price: string;
  timestamp: number;
  conditionId: string;
  title: string;
}

async function fetchTradesForEvent(eventId: number): Promise<RawTrade[]> {
  try {
    return await fetchJson(
      `${DATA_API}/trades?eventId=${eventId}&limit=${TRADES_PER_EVENT}`
    );
  } catch {
    return [];
  }
}

// --- Insert trades ---

function insertTrades(
  db: Database.Database,
  trades: RawTrade[],
  eventId: number
): number {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO trades (proxy_wallet, side, size, price, timestamp, condition_id, event_id, title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  const tx = db.transaction(() => {
    for (const t of trades) {
      const result = stmt.run(
        t.proxyWallet,
        t.side,
        parseFloat(t.size),
        parseFloat(t.price),
        t.timestamp,
        t.conditionId,
        eventId,
        t.title || ""
      );
      if (result.changes > 0) inserted++;
    }
  });

  tx();
  return inserted;
}

// --- Main routines ---

async function fullScan(db: Database.Database) {
  console.log("=== FULL SCAN ===");
  const startedAt = new Date().toISOString();

  console.log("Fetching all active event IDs...");
  const eventIds = await fetchAllEventIds();
  console.log(`Found ${eventIds.length} active events`);

  let totalInserted = 0;
  let processed = 0;

  for (let i = 0; i < eventIds.length; i += CONCURRENCY) {
    const batch = eventIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((eid) => fetchTradesForEvent(eid).then((trades) => ({ eid, trades })))
    );

    for (const { eid, trades } of results) {
      if (trades.length > 0) {
        const inserted = insertTrades(db, trades, eid);
        totalInserted += inserted;
      }
      processed++;
    }

    if (processed % 100 === 0 || processed === eventIds.length) {
      const pct = ((processed / eventIds.length) * 100).toFixed(1);
      console.log(
        `  Progress: ${processed}/${eventIds.length} events (${pct}%), ${totalInserted} new trades`
      );
    }
  }

  const finishedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO sync_log (mode, events_scanned, trades_inserted, started_at, finished_at) VALUES (?, ?, ?, ?, ?)"
  ).run("full", eventIds.length, totalInserted, startedAt, finishedAt);

  console.log(`\nDone. ${totalInserted} new trades from ${eventIds.length} events.`);
  printStats(db);
}

async function incrementalUpdate(db: Database.Database) {
  console.log("=== INCREMENTAL UPDATE ===");
  const startedAt = new Date().toISOString();

  console.log("Fetching top 500 active events...");
  const eventIds = await fetchTopEventIds(500);
  console.log(`Fetching trades from ${eventIds.length} events...`);

  let totalInserted = 0;

  for (let i = 0; i < eventIds.length; i += CONCURRENCY) {
    const batch = eventIds.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((eid) => fetchTradesForEvent(eid).then((trades) => ({ eid, trades })))
    );

    for (const { eid, trades } of results) {
      if (trades.length > 0) {
        totalInserted += insertTrades(db, trades, eid);
      }
    }
  }

  const finishedAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO sync_log (mode, events_scanned, trades_inserted, started_at, finished_at) VALUES (?, ?, ?, ?, ?)"
  ).run("update", eventIds.length, totalInserted, startedAt, finishedAt);

  console.log(`Done. ${totalInserted} new trades from ${eventIds.length} events.`);
  printStats(db);
}

function purgeOldData(db: Database.Database) {
  const cutoff = Math.floor(Date.now() / 1000) - PURGE_DAYS * 86400;
  const result = db.prepare("DELETE FROM trades WHERE timestamp < ?").run(cutoff);
  console.log(`Purged ${result.changes} trades older than ${PURGE_DAYS} days.`);
  db.exec("VACUUM");
  printStats(db);
}

function printStats(db: Database.Database) {
  const total = db.prepare("SELECT COUNT(*) as c FROM trades").get() as any;
  const wallets = db.prepare("SELECT COUNT(DISTINCT proxy_wallet) as c FROM trades").get() as any;
  const oldest = db.prepare("SELECT MIN(timestamp) as ts FROM trades").get() as any;
  const newest = db.prepare("SELECT MAX(timestamp) as ts FROM trades").get() as any;
  const dbSize = db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as any;

  console.log("\n--- Database Stats ---");
  console.log(`Trades:      ${total.c.toLocaleString()}`);
  console.log(`Wallets:     ${wallets.c.toLocaleString()}`);
  if (oldest.ts && newest.ts) {
    console.log(`Time range:  ${new Date(oldest.ts * 1000).toISOString().slice(0, 10)} to ${new Date(newest.ts * 1000).toISOString().slice(0, 10)}`);
    console.log(`Span:        ${((newest.ts - oldest.ts) / 86400).toFixed(1)} days`);
  }
  console.log(`DB size:     ${(dbSize.size / 1e6).toFixed(1)} MB`);
}

// --- CLI ---

async function main() {
  const mode = process.argv[2] || "update";
  const db = openDb();

  try {
    switch (mode) {
      case "full":
        await fullScan(db);
        break;
      case "update":
        await incrementalUpdate(db);
        break;
      case "purge":
        purgeOldData(db);
        break;
      case "stats":
        printStats(db);
        break;
      default:
        console.log("Usage: npx tsx scripts/collect.ts [full|update|purge|stats]");
    }
  } finally {
    db.close();
  }
}

main().catch(console.error);
