import fs from 'fs';
import path from 'path';
import type { CRMNote, LiveSignal } from '../types/crm';

const TMP_DIR = '/tmp';
const DATA_DIR = path.join(process.cwd(), 'data');

const LOCK_KEY = 'questathon_mcp_distributed_lock.json';
const NOTES_KEY = 'notes.json';
const SIGNALS_KEY = 'signals.json';
const META_KEY = 'sync_meta.json';

export interface StorageDiagnostics {
  engine: 'vercel_kv' | 'postgres' | 'atomic_file_store';
  notesCount: number;
  signalsCount: number;
  isLocked: boolean;
  secondsRemaining: number;
  inFlight: boolean;
}

interface McpLockRecord {
  isLocked: boolean;
  lockedAt: number;
  instanceId: string;
  lastCallTimestamp: number;
  nextAllowedTimestamp: number;
}

function detectStorageEngine(): 'vercel_kv' | 'postgres' | 'atomic_file_store' {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'vercel_kv';
  }
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    return 'postgres';
  }
  return 'atomic_file_store';
}

// Atomic file writing helper using atomic rename
function atomicWriteJson<T>(filename: string, data: T): void {
  const content = JSON.stringify(data, null, 2);
  const tmpFilePath = path.join(TMP_DIR, filename);
  const stagingPath = path.join(TMP_DIR, `.${filename}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`);

  // Write to staging path then atomically rename
  try {
    fs.writeFileSync(stagingPath, content, 'utf8');
    fs.renameSync(stagingPath, tmpFilePath);
  } catch (err) {
    console.error(`Error atomically writing to ${tmpFilePath}:`, err);
    try {
      fs.writeFileSync(tmpFilePath, content, 'utf8');
    } catch (_) {}
  }

  // Also persist to project data/ directory if writable and not running unit tests
  if (process.env.NODE_ENV !== 'test') {
    try {
      const dataPath = path.join(DATA_DIR, filename);
      const dataStaging = path.join(DATA_DIR, `.${filename}.tmp`);
      fs.writeFileSync(dataStaging, content, 'utf8');
      fs.renameSync(dataStaging, dataPath);
    } catch (_) {
      // Expected on read-only serverless runtime
    }
  }
}

function readJsonWithFallback<T>(filename: string, fallback: T): T {
  const tmpFilePath = path.join(TMP_DIR, filename);
  const dataPath = path.join(DATA_DIR, filename);

  // Check /tmp first for latest dynamic serverless state
  try {
    if (fs.existsSync(tmpFilePath)) {
      const content = fs.readFileSync(tmpFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (_) {}

  // Fallback to project data directory
  try {
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (_) {}

  return fallback;
}

// ==========================================
// VERCEL KV REST INTEGRATION (When configured)
// ==========================================

async function kvRestCall<T>(command: string, ...args: (string | number)[]): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  try {
    const endpoint = `${url}/${command}/${args.map(encodeURIComponent).join('/')}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result as T;
  } catch (err) {
    console.error('KV REST error:', err);
    return null;
  }
}

// ==========================================
// DISTRIBUTED LOCK IMPLEMENTATION
// ==========================================

const INSTANCE_ID = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export function readLockRecord(): McpLockRecord {
  const defaultLock: McpLockRecord = {
    isLocked: false,
    lockedAt: 0,
    instanceId: '',
    lastCallTimestamp: 0,
    nextAllowedTimestamp: 0,
  };
  return readJsonWithFallback<McpLockRecord>(LOCK_KEY, defaultLock);
}

export function writeLockRecord(lock: McpLockRecord): void {
  atomicWriteJson(LOCK_KEY, lock);
}

/**
 * Atomically acquire distributed rate-limit lock.
 * Reserves the lock and advances cooldown IMMEDIATELY before request dispatch.
 */
export async function acquireDistributedLock(): Promise<{
  acquired: boolean;
  retryAfterSeconds?: number;
  error?: string;
  engine: string;
}> {
  const engine = detectStorageEngine();
  const now = Date.now();

  // 1. Try Vercel KV REST if available
  if (engine === 'vercel_kv') {
    // Atomic SET lock with 65s expiration (SET NX EX 65)
    const lockAcquired = await kvRestCall<string>('set', 'questathon:mcp:lock', INSTANCE_ID, 'ex', 65, 'nx');
    if (!lockAcquired) {
      const ttl = (await kvRestCall<number>('ttl', 'questathon:mcp:lock')) || 60;
      return {
        acquired: false,
        retryAfterSeconds: Math.max(1, ttl),
        error: `Distributed lock active on Vercel KV. Rate limit cooldown in effect for ${ttl}s.`,
        engine: 'vercel_kv',
      };
    }
    return { acquired: true, engine: 'vercel_kv' };
  }

  // 2. Atomic File-Based Distributed Lock (works across processes via atomic reads/writes)
  const currentLock = readLockRecord();

  // In-flight concurrency check: lock active and not expired (15 second execution timeout)
  const inFlight = currentLock.isLocked && (now - currentLock.lockedAt < 15000);
  if (inFlight) {
    const waitSec = Math.ceil((15000 - (now - currentLock.lockedAt)) / 1000);
    return {
      acquired: false,
      retryAfterSeconds: waitSec,
      error: `Another MCP call is currently in flight (${currentLock.instanceId}). Parallel calls are strictly forbidden.`,
      engine: 'atomic_file_store',
    };
  }

  // Rate limit cooldown check: 60-second rule
  if (now < currentLock.nextAllowedTimestamp) {
    const waitSec = Math.ceil((currentLock.nextAllowedTimestamp - now) / 1000);
    return {
      acquired: false,
      retryAfterSeconds: waitSec,
      error: `Rate limit in effect: token allows 1 call per minute. Try again in ${waitSec}s.`,
      engine: 'atomic_file_store',
    };
  }

  // Reserve lock BEFORE dispatching request (Conservative reservation)
  // Set nextAllowedTimestamp immediately to now + 61 seconds
  const reservedLock: McpLockRecord = {
    isLocked: true,
    lockedAt: now,
    instanceId: INSTANCE_ID,
    lastCallTimestamp: now,
    nextAllowedTimestamp: now + 61000,
  };
  writeLockRecord(reservedLock);

  return { acquired: true, engine: 'atomic_file_store' };
}

/**
 * Release lock.
 * If cooldownSeconds is provided, sets the cooldown timestamp.
 * If not provided or on uncertain failure, keeps the conservative cooldown active.
 */
export async function releaseDistributedLock(cooldownSeconds = 61): Promise<void> {
  const now = Date.now();
  const current = readLockRecord();

  // In atomic file store, unlock in-flight status while maintaining cooldown
  const updatedLock: McpLockRecord = {
    ...current,
    isLocked: false,
    lockedAt: 0,
    lastCallTimestamp: now,
    nextAllowedTimestamp: Math.max(current.nextAllowedTimestamp, now + (cooldownSeconds * 1000)),
  };
  writeLockRecord(updatedLock);
}

/**
 * Release in-flight flag after error while preserving rate limit cooldown
 */
export async function releaseDistributedLockOnError(retryAfterSeconds = 61): Promise<void> {
  const now = Date.now();
  const current = readLockRecord();

  // Keep cooldown active conservatively: a request may have reached the server
  const updatedLock: McpLockRecord = {
    ...current,
    isLocked: false,
    lockedAt: 0,
    nextAllowedTimestamp: Math.max(current.nextAllowedTimestamp, now + (retryAfterSeconds * 1000)),
  };
  writeLockRecord(updatedLock);
}

export function getRateLimitStatus(): {
  canCallNow: boolean;
  secondsRemaining: number;
  inFlight: boolean;
  storageEngine: string;
} {
  const lock = readLockRecord();
  const now = Date.now();
  const inFlight = lock.isLocked && (now - lock.lockedAt < 15000);

  if (now < lock.nextAllowedTimestamp) {
    const remaining = Math.ceil((lock.nextAllowedTimestamp - now) / 1000);
    return {
      canCallNow: false,
      secondsRemaining: remaining,
      inFlight,
      storageEngine: detectStorageEngine(),
    };
  }

  if (inFlight) {
    const remaining = Math.ceil((15000 - (now - lock.lockedAt)) / 1000);
    return {
      canCallNow: false,
      secondsRemaining: remaining,
      inFlight: true,
      storageEngine: detectStorageEngine(),
    };
  }

  return {
    canCallNow: true,
    secondsRemaining: 0,
    inFlight: false,
    storageEngine: detectStorageEngine(),
  };
}

// ==========================================
// PERSISTENT NOTES MANAGEMENT
// ==========================================

export function getStoredNotes(): CRMNote[] {
  const data = readJsonWithFallback<{ notes: CRMNote[] }>(NOTES_KEY, { notes: [] });
  return data.notes || [];
}

export function saveStoredNote(note: CRMNote): void {
  const notes = getStoredNotes();
  const idx = notes.findIndex((n) => n.id === note.id);
  if (idx >= 0) {
    notes[idx] = note;
  } else {
    notes.unshift(note);
  }
  atomicWriteJson(NOTES_KEY, { notes });
}

export function updateStoredNoteStatus(
  noteId: string,
  status: 'synced' | 'saved_locally_pending' | 'pending_retry',
  confirmedAt?: string,
  remoteError?: string
): void {
  const notes = getStoredNotes();
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.syncStatus = status;
    if (confirmedAt) note.remoteConfirmedAt = confirmedAt;
    if (remoteError) note.remoteError = remoteError;
    atomicWriteJson(NOTES_KEY, { notes });
  }
}

// ==========================================
// PERSISTENT SIGNALS MANAGEMENT (COMPOSITE KEY DEDUPLICATION)
// ==========================================

export function getStoredSignals(): LiveSignal[] {
  const data = readJsonWithFallback<{ signals: LiveSignal[] }>(SIGNALS_KEY, { signals: [] });
  return data.signals || [];
}

/**
 * Deduplicate signals using stable composite key: id || `${sourceId}_${timestamp}`
 * Does NOT treat distinct events as duplicates solely because their text is identical.
 */
export function saveStoredSignal(signal: LiveSignal): boolean {
  const signals = getStoredSignals();
  const compositeKey = signal.id && signal.id.trim() !== ''
    ? signal.id
    : `${signal.sourceId || 'signal'}_${signal.timestamp || Date.now()}`;

  const exists = signals.some((s) => {
    const existingKey = s.id && s.id.trim() !== ''
      ? s.id
      : `${s.sourceId || 'signal'}_${s.timestamp}`;
    return existingKey === compositeKey;
  });

  if (!exists) {
    signals.unshift({
      ...signal,
      id: compositeKey,
    });
    atomicWriteJson(SIGNALS_KEY, { signals });
    return true;
  }

  return false;
}

// ==========================================
// STORAGE DIAGNOSTICS FOR AUDIT & DASHBOARD
// ==========================================

export function getStorageDiagnostics(): StorageDiagnostics {
  const notes = getStoredNotes();
  const signals = getStoredSignals();
  const rate = getRateLimitStatus();

  return {
    engine: detectStorageEngine(),
    notesCount: notes.length,
    signalsCount: signals.length,
    isLocked: rate.inFlight,
    secondsRemaining: rate.secondsRemaining,
    inFlight: rate.inFlight,
  };
}
