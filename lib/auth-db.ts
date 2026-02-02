import { createClient } from '@libsql/client';
import crypto from 'crypto';

// Use the same Turso database for user data
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize tables (run once on first request)
let tablesInitialized = false;

async function ensureTables() {
  if (tablesInitialized) return;

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

    CREATE TABLE IF NOT EXISTS listening_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sermon_code TEXT NOT NULL,
      position REAL DEFAULT 0,
      duration REAL DEFAULT 0,
      last_played_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, sermon_code)
    );

    CREATE INDEX IF NOT EXISTS idx_listening_user ON listening_history(user_id);

    CREATE TABLE IF NOT EXISTS listening_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sermon_code TEXT NOT NULL,
      position_in_queue INTEGER NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'individual',
      source_id INTEGER,
      added_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, sermon_code)
    );

    CREATE INDEX IF NOT EXISTS idx_queue_user ON listening_queue(user_id);
    CREATE INDEX IF NOT EXISTS idx_queue_order ON listening_queue(user_id, position_in_queue);
  `);

  tablesInitialized = true;
}

// ============ Password Hashing ============

function hashPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ============ User Functions ============

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export async function createUser(username: string, password: string): Promise<User> {
  await ensureTables();

  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }
  if (username.length > 30) {
    throw new Error('Username must be 30 characters or less');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }

  const existing = await client.execute({
    sql: 'SELECT id FROM users WHERE username = ?',
    args: [username],
  });
  if (existing.rows.length > 0) {
    throw new Error('Username already taken');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await client.execute({
    sql: 'INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)',
    args: [username, passwordHash, salt],
  });

  return {
    id: Number(result.lastInsertRowid),
    username,
    created_at: new Date().toISOString(),
  };
}

export async function verifyUser(username: string, password: string): Promise<User | null> {
  await ensureTables();

  const result = await client.execute({
    sql: 'SELECT id, username, password_hash, salt, created_at FROM users WHERE username = ?',
    args: [username],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const hash = await hashPassword(password, String(row.salt));
  if (hash !== String(row.password_hash)) return null;

  return {
    id: Number(row.id),
    username: String(row.username),
    created_at: String(row.created_at),
  };
}

export async function getUserById(id: number): Promise<User | null> {
  await ensureTables();

  const result = await client.execute({
    sql: 'SELECT id, username, created_at FROM users WHERE id = ?',
    args: [id],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    created_at: String(row.created_at),
  };
}

// ============ Session Functions ============

const SESSION_DURATION_DAYS = 30;

export async function createSession(userId: number): Promise<string> {
  await ensureTables();

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await client.execute({
    sql: 'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
    args: [userId, token, expiresAt.toISOString()],
  });

  return token;
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  await ensureTables();

  const result = await client.execute({
    sql: `
      SELECT u.id, u.username, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `,
    args: [token],
  });

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    created_at: String(row.created_at),
  };
}

export async function deleteSession(token: string): Promise<void> {
  await ensureTables();
  await client.execute({
    sql: 'DELETE FROM sessions WHERE token = ?',
    args: [token],
  });
}

export async function deleteExpiredSessions(): Promise<void> {
  await ensureTables();
  await client.execute({
    sql: "DELETE FROM sessions WHERE expires_at <= datetime('now')",
    args: [],
  });
}

// ============ Listening History Functions ============

export interface ListeningEntry {
  sermon_code: string;
  position: number;
  duration: number;
  last_played_at: string;
}

export async function saveListeningPosition(
  userId: number,
  sermonCode: string,
  position: number,
  duration: number
): Promise<void> {
  await ensureTables();
  await client.execute({
    sql: `
      INSERT INTO listening_history (user_id, sermon_code, position, duration, last_played_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, sermon_code) DO UPDATE SET
        position = excluded.position,
        duration = excluded.duration,
        last_played_at = datetime('now')
    `,
    args: [userId, sermonCode, position, duration],
  });
}

export async function getListeningHistory(userId: number): Promise<ListeningEntry[]> {
  await ensureTables();
  const result = await client.execute({
    sql: `
      SELECT sermon_code, position, duration, last_played_at
      FROM listening_history
      WHERE user_id = ?
      ORDER BY last_played_at DESC
    `,
    args: [userId],
  });
  return result.rows as unknown as ListeningEntry[];
}

export async function getListeningPosition(userId: number, sermonCode: string): Promise<ListeningEntry | null> {
  await ensureTables();
  const result = await client.execute({
    sql: `
      SELECT sermon_code, position, duration, last_played_at
      FROM listening_history
      WHERE user_id = ? AND sermon_code = ?
    `,
    args: [userId, sermonCode],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as ListeningEntry) : null;
}

// ============ Listening Queue Functions ============

export interface QueueEntry {
  sermon_code: string;
  position_in_queue: number;
  source_type: string;
  source_id: number | null;
  added_at: string;
}

export async function getQueue(userId: number): Promise<QueueEntry[]> {
  await ensureTables();
  const result = await client.execute({
    sql: `
      SELECT sermon_code, position_in_queue, source_type, source_id, added_at
      FROM listening_queue
      WHERE user_id = ?
      ORDER BY position_in_queue ASC
    `,
    args: [userId],
  });
  return result.rows as unknown as QueueEntry[];
}

export async function addToQueue(
  userId: number,
  sermonCode: string,
  sourceType: string = 'individual',
  sourceId: number | null = null
): Promise<void> {
  await ensureTables();

  const maxPos = await client.execute({
    sql: 'SELECT COALESCE(MAX(position_in_queue), -1) as max_pos FROM listening_queue WHERE user_id = ?',
    args: [userId],
  });

  const nextPos = Number(maxPos.rows[0].max_pos) + 1;

  await client.execute({
    sql: `
      INSERT INTO listening_queue (user_id, sermon_code, position_in_queue, source_type, source_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, sermon_code) DO NOTHING
    `,
    args: [userId, sermonCode, nextPos, sourceType, sourceId],
  });
}

export async function insertAtTopOfQueue(
  userId: number,
  sermonCode: string,
  sourceType: string = 'individual',
  sourceId: number | null = null
): Promise<void> {
  await ensureTables();

  // Check if already in queue
  const existing = await client.execute({
    sql: 'SELECT position_in_queue FROM listening_queue WHERE user_id = ? AND sermon_code = ?',
    args: [userId, sermonCode],
  });

  if (existing.rows.length > 0) {
    const oldPos = Number(existing.rows[0].position_in_queue);
    await client.execute({
      sql: 'DELETE FROM listening_queue WHERE user_id = ? AND sermon_code = ?',
      args: [userId, sermonCode],
    });
    await client.execute({
      sql: 'UPDATE listening_queue SET position_in_queue = position_in_queue - 1 WHERE user_id = ? AND position_in_queue > ?',
      args: [userId, oldPos],
    });
  }

  // Shift everything down by 1
  await client.execute({
    sql: 'UPDATE listening_queue SET position_in_queue = position_in_queue + 1 WHERE user_id = ?',
    args: [userId],
  });

  // Insert at position 0
  await client.execute({
    sql: `INSERT INTO listening_queue (user_id, sermon_code, position_in_queue, source_type, source_id)
          VALUES (?, ?, 0, ?, ?)`,
    args: [userId, sermonCode, sourceType, sourceId],
  });
}

export async function addSeriesToQueue(
  userId: number,
  seriesId: number,
  sermonCodes: string[]
): Promise<void> {
  await ensureTables();

  const maxPos = await client.execute({
    sql: 'SELECT COALESCE(MAX(position_in_queue), -1) as max_pos FROM listening_queue WHERE user_id = ?',
    args: [userId],
  });

  let nextPos = Number(maxPos.rows[0].max_pos) + 1;

  for (const code of sermonCodes) {
    const result = await client.execute({
      sql: `INSERT INTO listening_queue (user_id, sermon_code, position_in_queue, source_type, source_id)
            VALUES (?, ?, ?, 'series', ?)
            ON CONFLICT(user_id, sermon_code) DO NOTHING`,
      args: [userId, code, nextPos, seriesId],
    });
    if (result.rowsAffected > 0) {
      nextPos++;
    }
  }
}

export async function removeFromQueue(userId: number, sermonCode: string): Promise<void> {
  await ensureTables();

  const entry = await client.execute({
    sql: 'SELECT position_in_queue FROM listening_queue WHERE user_id = ? AND sermon_code = ?',
    args: [userId, sermonCode],
  });

  if (entry.rows.length === 0) return;

  const pos = Number(entry.rows[0].position_in_queue);

  await client.execute({
    sql: 'DELETE FROM listening_queue WHERE user_id = ? AND sermon_code = ?',
    args: [userId, sermonCode],
  });

  await client.execute({
    sql: 'UPDATE listening_queue SET position_in_queue = position_in_queue - 1 WHERE user_id = ? AND position_in_queue > ?',
    args: [userId, pos],
  });
}

export async function moveInQueue(userId: number, sermonCode: string, direction: 'up' | 'down'): Promise<void> {
  await ensureTables();

  const entry = await client.execute({
    sql: 'SELECT position_in_queue FROM listening_queue WHERE user_id = ? AND sermon_code = ?',
    args: [userId, sermonCode],
  });

  if (entry.rows.length === 0) return;

  const currentPos = Number(entry.rows[0].position_in_queue);
  const targetPos = direction === 'up' ? currentPos - 1 : currentPos + 1;

  if (targetPos < 0) return;

  const targetEntry = await client.execute({
    sql: 'SELECT sermon_code FROM listening_queue WHERE user_id = ? AND position_in_queue = ?',
    args: [userId, targetPos],
  });

  if (targetEntry.rows.length === 0) return;

  const targetCode = String(targetEntry.rows[0].sermon_code);

  await client.execute({
    sql: 'UPDATE listening_queue SET position_in_queue = ? WHERE user_id = ? AND sermon_code = ?',
    args: [targetPos, userId, sermonCode],
  });
  await client.execute({
    sql: 'UPDATE listening_queue SET position_in_queue = ? WHERE user_id = ? AND sermon_code = ?',
    args: [currentPos, userId, targetCode],
  });
}

export async function clearQueue(userId: number): Promise<void> {
  await ensureTables();
  await client.execute({
    sql: 'DELETE FROM listening_queue WHERE user_id = ?',
    args: [userId],
  });
}

export async function getQueueLength(userId: number): Promise<number> {
  await ensureTables();
  const result = await client.execute({
    sql: 'SELECT COUNT(*) as cnt FROM listening_queue WHERE user_id = ?',
    args: [userId],
  });
  return Number(result.rows[0].cnt);
}

export async function replaceQueue(
  userId: number,
  items: { sermonCode: string; sourceType: string; sourceId: number | null }[]
): Promise<void> {
  await ensureTables();

  await client.execute({
    sql: 'DELETE FROM listening_queue WHERE user_id = ?',
    args: [userId],
  });

  for (let i = 0; i < items.length; i++) {
    await client.execute({
      sql: `INSERT INTO listening_queue (user_id, sermon_code, position_in_queue, source_type, source_id)
            VALUES (?, ?, ?, ?, ?)`,
      args: [userId, items[i].sermonCode, i, items[i].sourceType, items[i].sourceId],
    });
  }
}
