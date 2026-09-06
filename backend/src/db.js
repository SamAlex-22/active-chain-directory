import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../audit_logs.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT,
      actor TEXT,
      assetId INTEGER,
      details TEXT,
      timestamp INTEGER,
      txHash TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester TEXT NOT NULL,
      recipient TEXT NOT NULL,
      tokenId INTEGER NOT NULL,
      riskScore INTEGER NOT NULL,
      riskLevel TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'PENDING',
      createdAt INTEGER NOT NULL,
      approvedBy TEXT,
      signature TEXT,
      nonce INTEGER,
      deadline INTEGER
    )
  `);
});

export default db;
