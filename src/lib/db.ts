import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "walletviz.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("synchronous = NORMAL");
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
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
}

export interface TradeRow {
  proxy_wallet: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  condition_id: string;
  event_id: number;
  title: string;
}
