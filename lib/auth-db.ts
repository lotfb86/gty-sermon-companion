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

    CREATE TABLE IF NOT EXISTS listening_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sermon_code TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      listened_seconds REAL NOT NULL DEFAULT 0,
      sessions_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, sermon_code, activity_date)
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user_date ON listening_activity(user_id, activity_date);
    CREATE INDEX IF NOT EXISTS idx_activity_user_sermon ON listening_activity(user_id, sermon_code);

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

  // Lightweight migrations for older installs
  const tableInfo = await client.execute({
    sql: "PRAGMA table_info('listening_history')",
    args: [],
  });
  const hasCompletedAt = tableInfo.rows.some((row) => String(row.name) === 'completed_at');
  if (!hasCompletedAt) {
    await client.execute({
      sql: 'ALTER TABLE listening_history ADD COLUMN completed_at TEXT',
      args: [],
    });
  }

  await client.execute({
    sql: `
      UPDATE listening_history
      SET completed_at = COALESCE(completed_at, last_played_at)
      WHERE completed_at IS NULL
        AND duration > 0
        AND position >= duration * 0.9
    `,
    args: [],
  });

  // Backfill one activity row per sermon for legacy data (best-effort)
  await client.execute({
    sql: `
      INSERT OR IGNORE INTO listening_activity (
        user_id, sermon_code, activity_date, listened_seconds, sessions_count, updated_at
      )
      SELECT
        user_id,
        sermon_code,
        substr(last_played_at, 1, 10),
        CASE WHEN position > 0 THEN position ELSE 0 END,
        1,
        COALESCE(last_played_at, datetime('now'))
      FROM listening_history
      WHERE last_played_at IS NOT NULL
    `,
    args: [],
  });

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
  completed_at?: string | null;
}

export async function saveListeningPosition(
  userId: number,
  sermonCode: string,
  position: number,
  duration: number
): Promise<void> {
  await ensureTables();
  const safePosition = Number.isFinite(position) ? Math.max(0, position) : 0;
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;

  const existingResult = await client.execute({
    sql: `
      SELECT position, duration, last_played_at
      FROM listening_history
      WHERE user_id = ? AND sermon_code = ?
      LIMIT 1
    `,
    args: [userId, sermonCode],
  });

  const existing = existingResult.rows[0];
  const prevPosition = existing ? Number(existing.position || 0) : 0;
  const prevPlayedAt = existing ? String(existing.last_played_at || '') : '';

  // Estimate newly listened seconds from forward progress only.
  const forwardDelta = safePosition > prevPosition ? safePosition - prevPosition : 0;
  let creditedSeconds = 0;

  if (!existing) {
    // First sync point can be a restore/seek. Credit conservatively.
    creditedSeconds = Math.min(safePosition, 30);
  } else if (forwardDelta > 0) {
    const nowMs = Date.now();
    const prevMs = Date.parse(prevPlayedAt);
    const elapsedSeconds = Number.isFinite(prevMs) ? Math.max(0, (nowMs - prevMs) / 1000) : 0;
    const maxCreditable = Math.max(30, elapsedSeconds * 1.75 + 10);
    creditedSeconds = forwardDelta <= maxCreditable ? forwardDelta : 0;
  }

  const isCompleted = safeDuration > 0 && safePosition / safeDuration >= 0.9;
  const normalizedPosition = safeDuration > 0 ? Math.min(safePosition, safeDuration) : safePosition;

  await client.execute({
    sql: `
      INSERT INTO listening_history (user_id, sermon_code, position, duration, last_played_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, sermon_code) DO UPDATE SET
        position = excluded.position,
        duration = CASE
          WHEN excluded.duration > 0 THEN excluded.duration
          ELSE listening_history.duration
        END,
        last_played_at = datetime('now')
    `,
    args: [userId, sermonCode, normalizedPosition, safeDuration],
  });

  if (isCompleted) {
    await client.execute({
      sql: `
        UPDATE listening_history
        SET completed_at = COALESCE(completed_at, datetime('now'))
        WHERE user_id = ? AND sermon_code = ?
      `,
      args: [userId, sermonCode],
    });
  }

  if (creditedSeconds > 0) {
    const activityDate = new Date().toISOString().slice(0, 10);
    await client.execute({
      sql: `
        INSERT INTO listening_activity (
          user_id, sermon_code, activity_date, listened_seconds, sessions_count, updated_at
        )
        VALUES (?, ?, ?, ?, 1, datetime('now'))
        ON CONFLICT(user_id, sermon_code, activity_date) DO UPDATE SET
          listened_seconds = listening_activity.listened_seconds + excluded.listened_seconds,
          sessions_count = listening_activity.sessions_count + 1,
          updated_at = datetime('now')
      `,
      args: [userId, sermonCode, activityDate, creditedSeconds],
    });
  }
}

export async function getListeningHistory(userId: number): Promise<ListeningEntry[]> {
  await ensureTables();
  const result = await client.execute({
    sql: `
      SELECT sermon_code, position, duration, last_played_at, completed_at
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
      SELECT sermon_code, position, duration, last_played_at, completed_at
      FROM listening_history
      WHERE user_id = ? AND sermon_code = ?
    `,
    args: [userId, sermonCode],
  });
  return result.rows.length > 0 ? (result.rows[0] as unknown as ListeningEntry) : null;
}

export type ListeningRange = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

export interface ListeningStatsSummary {
  range: ListeningRange;
  hoursListened: number;
  seriesCompleted: number;
  streak: number;
  sermonsListened: number;
  activeDays: number;
}

export interface ListeningHistoryItem {
  sermon_code: string;
  title: string;
  audio_url?: string | null;
  date_preached?: string | null;
  series_name?: string | null;
  position: number;
  duration: number;
  last_played_at: string;
  completed_at?: string | null;
  progress_percent: number;
  is_completed: boolean;
  listen_dates: string[];
  listened_seconds: number;
}

export interface ListeningHistoryPage {
  range: ListeningRange;
  items: ListeningHistoryItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

function normalizeRange(input: string | null | undefined): ListeningRange {
  const valid: ListeningRange[] = ['7d', '30d', '90d', '180d', '365d', 'all'];
  if (input && valid.includes(input as ListeningRange)) {
    return input as ListeningRange;
  }
  return '30d';
}

function getRangeStartDate(range: ListeningRange): string | null {
  if (range === 'all') return null;

  const rangeDays: Record<Exclude<ListeningRange, 'all'>, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '365d': 365,
  };

  const days = rangeDays[range];
  const start = new Date();
  // Include today in the selected window
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start.toISOString().slice(0, 10);
}

function calculateStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;

  const uniqueSorted = Array.from(new Set(activityDates)).sort((a, b) => b.localeCompare(a));
  if (uniqueSorted.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (uniqueSorted[0] !== today && uniqueSorted[0] !== yesterdayDate) {
    return 0;
  }

  let streak = 1;
  const expected = new Date(uniqueSorted[0]);
  expected.setUTCDate(expected.getUTCDate() - 1);

  for (let i = 1; i < uniqueSorted.length; i++) {
    const expectedStr = expected.toISOString().slice(0, 10);
    if (uniqueSorted[i] !== expectedStr) break;
    streak++;
    expected.setUTCDate(expected.getUTCDate() - 1);
  }

  return streak;
}

export async function getListeningStatsSummary(
  userId: number,
  rawRange?: string
): Promise<ListeningStatsSummary> {
  await ensureTables();
  const range = normalizeRange(rawRange);
  const startDate = getRangeStartDate(range);

  const statsArgs: (number | string)[] = [userId];
  let statsRangeWhere = '';
  if (startDate) {
    statsRangeWhere = 'AND activity_date >= ?';
    statsArgs.push(startDate);
  }

  const usageResult = await client.execute({
    sql: `
      SELECT
        COALESCE(SUM(listened_seconds), 0) as total_seconds,
        COUNT(DISTINCT sermon_code) as sermons_listened,
        COUNT(DISTINCT activity_date) as active_days
      FROM listening_activity
      WHERE user_id = ?
      ${statsRangeWhere}
    `,
    args: statsArgs,
  });

  const activityDaysResult = await client.execute({
    sql: `
      SELECT DISTINCT activity_date
      FROM listening_activity
      WHERE user_id = ?
      ${statsRangeWhere}
      ORDER BY activity_date DESC
    `,
    args: statsArgs,
  });
  const activityDays = activityDaysResult.rows.map((row) => String(row.activity_date));

  const seriesArgs: (number | string)[] = [userId];
  let seriesRangeWhere = '';
  if (startDate) {
    seriesRangeWhere = 'AND date(sc.series_completed_at) >= date(?)';
    seriesArgs.push(startDate);
  }

  const seriesResult = await client.execute({
    sql: `
      WITH series_totals AS (
        SELECT series_id, COUNT(*) as total_sermons
        FROM sermons
        WHERE series_id IS NOT NULL
          AND title != 'Sermon Not Found'
        GROUP BY series_id
      ),
      series_user_completed AS (
        SELECT
          s.series_id,
          COUNT(DISTINCT lh.sermon_code) as completed_sermons,
          MAX(lh.completed_at) as series_completed_at
        FROM listening_history lh
        JOIN sermons s ON s.sermon_code = lh.sermon_code
        WHERE lh.user_id = ?
          AND lh.completed_at IS NOT NULL
          AND s.series_id IS NOT NULL
          AND s.title != 'Sermon Not Found'
        GROUP BY s.series_id
      )
      SELECT COUNT(*) as series_completed
      FROM series_user_completed sc
      JOIN series_totals st ON st.series_id = sc.series_id
      WHERE sc.completed_sermons >= st.total_sermons
      ${seriesRangeWhere}
    `,
    args: seriesArgs,
  });

  const usageRow = usageResult.rows[0];
  const totalSeconds = Number(usageRow?.total_seconds || 0);
  const sermonsListened = Number(usageRow?.sermons_listened || 0);
  const activeDays = Number(usageRow?.active_days || 0);
  const seriesCompleted = Number(seriesResult.rows[0]?.series_completed || 0);

  return {
    range,
    hoursListened: Math.round((totalSeconds / 3600) * 10) / 10,
    seriesCompleted,
    streak: calculateStreak(activityDays),
    sermonsListened,
    activeDays,
  };
}

export async function getListeningHistoryPage(
  userId: number,
  rawRange?: string,
  limit = 30,
  offset = 0
): Promise<ListeningHistoryPage> {
  await ensureTables();
  const range = normalizeRange(rawRange);
  const startDate = getRangeStartDate(range);
  const safeLimit = Math.max(1, Math.min(100, Number.isFinite(limit) ? limit : 30));
  const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);

  const countArgs: (number | string)[] = [userId];
  let rangeExistsClause = '';
  if (startDate) {
    rangeExistsClause = 'AND la.activity_date >= ?';
    countArgs.push(startDate);
  }

  const totalResult = await client.execute({
    sql: `
      SELECT COUNT(*) as total
      FROM listening_history lh
      JOIN sermons s ON s.sermon_code = lh.sermon_code
      WHERE lh.user_id = ?
        AND s.title != 'Sermon Not Found'
        AND EXISTS (
          SELECT 1
          FROM listening_activity la
          WHERE la.user_id = lh.user_id
            AND la.sermon_code = lh.sermon_code
            ${rangeExistsClause}
        )
    `,
    args: countArgs,
  });
  const total = Number(totalResult.rows[0]?.total || 0);

  const rowsArgs: (number | string)[] = [userId];
  let rowsExistsClause = '';
  if (startDate) {
    rowsExistsClause = 'AND la.activity_date >= ?';
    rowsArgs.push(startDate);
  }
  rowsArgs.push(safeLimit, safeOffset);

  const rowsResult = await client.execute({
    sql: `
      SELECT
        lh.sermon_code,
        lh.position,
        lh.duration,
        lh.last_played_at,
        lh.completed_at,
        s.title,
        s.audio_url,
        s.date_preached,
        se.name as series_name
      FROM listening_history lh
      JOIN sermons s ON s.sermon_code = lh.sermon_code
      LEFT JOIN series se ON se.id = s.series_id
      WHERE lh.user_id = ?
        AND s.title != 'Sermon Not Found'
        AND EXISTS (
          SELECT 1
          FROM listening_activity la
          WHERE la.user_id = lh.user_id
            AND la.sermon_code = lh.sermon_code
            ${rowsExistsClause}
        )
      ORDER BY lh.last_played_at DESC
      LIMIT ? OFFSET ?
    `,
    args: rowsArgs,
  });

  const sermonCodes = rowsResult.rows.map((row) => String(row.sermon_code));
  const datesBySermon = new Map<string, string[]>();
  const listenedSecondsBySermon = new Map<string, number>();

  if (sermonCodes.length > 0) {
    const placeholders = sermonCodes.map(() => '?').join(', ');
    const activityArgs: (number | string)[] = [userId, ...sermonCodes];
    let activityRangeClause = '';
    if (startDate) {
      activityRangeClause = 'AND activity_date >= ?';
      activityArgs.push(startDate);
    }

    const activityRows = await client.execute({
      sql: `
        SELECT sermon_code, activity_date, listened_seconds
        FROM listening_activity
        WHERE user_id = ?
          AND sermon_code IN (${placeholders})
          ${activityRangeClause}
        ORDER BY activity_date DESC
      `,
      args: activityArgs,
    });

    for (const row of activityRows.rows) {
      const sermonCode = String(row.sermon_code);
      const activityDate = String(row.activity_date);
      const listenedSeconds = Number(row.listened_seconds || 0);

      const existingDates = datesBySermon.get(sermonCode) || [];
      if (!existingDates.includes(activityDate)) {
        existingDates.push(activityDate);
        datesBySermon.set(sermonCode, existingDates);
      }

      listenedSecondsBySermon.set(
        sermonCode,
        (listenedSecondsBySermon.get(sermonCode) || 0) + listenedSeconds
      );
    }
  }

  const items: ListeningHistoryItem[] = rowsResult.rows.map((row) => {
    const sermonCode = String(row.sermon_code);
    const position = Number(row.position || 0);
    const duration = Number(row.duration || 0);
    const rawProgress = duration > 0 ? (position / duration) * 100 : 0;
    const isCompleted = Boolean(row.completed_at) || rawProgress >= 90;

    return {
      sermon_code: sermonCode,
      title: String(row.title || ''),
      audio_url: row.audio_url ? String(row.audio_url) : null,
      date_preached: row.date_preached ? String(row.date_preached) : null,
      series_name: row.series_name ? String(row.series_name) : null,
      position,
      duration,
      last_played_at: String(row.last_played_at || ''),
      completed_at: row.completed_at ? String(row.completed_at) : null,
      progress_percent: isCompleted ? 100 : Math.max(0, Math.min(100, rawProgress)),
      is_completed: isCompleted,
      listen_dates: datesBySermon.get(sermonCode) || [],
      listened_seconds: listenedSecondsBySermon.get(sermonCode) || 0,
    };
  });

  return {
    range,
    items,
    total,
    offset: safeOffset,
    limit: safeLimit,
    hasMore: safeOffset + items.length < total,
  };
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
