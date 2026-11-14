import fs from 'fs';
import path from 'path';
import type { CRMNote, LiveSignal } from '../types/crm';

const TMP_DIR = '/tmp';
const DATA_DIR = path.join(process.cwd(), 'data');

const LOCK_KEY = 'questathon_mcp_distributed_lock.json';
const NOTES_KEY = 'notes.json';
const SIGNALS_KEY = 'signals.json';

export interface StorageDiagnostics {
  engine: 'vercel_kv' | 'atomic_file_store';
  engineDescription: string;
  isDistributed: boolean;
  kvConnected: boolean;
  status: 'healthy' | 'degraded_local_fallback';
  notesCount: number;
  signalsCount: number;
  pendingNotesCount: number;
  isLocked: boolean;
  secondsRemaining: number;
  inFlight: boolean;
  lastKvError?: string;
}

export interface McpLockRecord {
  inFlightInstanceId: string;
  inFlightUntil: number;
  cooldownUntil: number;
  lastCallTimestamp: number;
}

let lastRecordedKvError: string | undefined = undefined;

export function detectStorageEngine(): 'vercel_kv' | 'atomic_file_store' {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'vercel_kv';
  }
  return 'atomic_file_store';
}

// Atomic file writing helper using atomic rename
function atomicWriteJson<T>(filename: string, data: T): void {
  const content = JSON.stringify(data, null, 2);
  const tmpFilePath = path.join(TMP_DIR, filename);
  const stagingPath = path.join(TMP_DIR, `.${filename}.${Date.now()}.${Math.random().toString(36).substring(2)}.tmp`);

  try {
    fs.writeFileSync(stagingPath, content, 'utf8');
    fs.renameSync(stagingPath, tmpFilePath);
  } catch (err) {
    console.error(`Error atomically writing to ${tmpFilePath}:`, err);
    try {
      fs.writeFileSync(tmpFilePath, content, 'utf8');
    } catch (_) {}
  }

  if (process.env.NODE_ENV !== 'test') {
    try {
      const dataPath = path.join(DATA_DIR, filename);
      const dataStaging = path.join(DATA_DIR, `.${filename}.tmp`);
      fs.writeFileSync(dataStaging, content, 'utf8');
      fs.renameSync(dataStaging, dataPath);
    } catch (_) {}
  }
}

function readJsonWithFallback<T>(filename: string, fallback: T): T {
  const tmpFilePath = path.join(TMP_DIR, filename);
  const dataPath = path.join(DATA_DIR, filename);

  try {
    if (fs.existsSync(tmpFilePath)) {
      const content = fs.readFileSync(tmpFilePath, 'utf8');
      return JSON.parse(content);
    }
  } catch (_) {}

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

export interface KvCommandResult<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
}

export async function kvRestCommand<T>(command: (string | number)[]): Promise<KvCommandResult<T>> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    return { ok: false, error: 'KV_REST_API_URL or KV_REST_API_TOKEN not configured' };
  }

  try {
    const baseUrl = url.replace(/\/$/, '');
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = json?.error || `KV REST HTTP ${res.status}: ${res.statusText}`;
      lastRecordedKvError = errMsg;
      return { ok: false, error: errMsg };
    }

    if (json && json.error) {
      lastRecordedKvError = json.error;
      return { ok: false, error: json.error };
    }

    lastRecordedKvError = undefined;
    return { ok: true, result: json?.result as T };
  } catch (err: any) {
    const errMsg = err?.message || 'Network error reaching Vercel KV REST';
    lastRecordedKvError = errMsg;
    return { ok: false, error: errMsg };
  }
}

export async function kvRestCall<T>(command: string, ...args: (string | number)[]): Promise<KvCommandResult<T>> {
  return kvRestCommand<T>([command.toUpperCase(), ...args]);
}

// ==========================================
// SEPARATED DISTRIBUTED LOCK IMPLEMENTATION
// In-flight execution lock + Cooldown lock with atomic Lua compare-and-delete
// ==========================================

export function readLockRecord(): McpLockRecord {
  const defaultLock: McpLockRecord = {
    inFlightInstanceId: '',
    inFlightUntil: 0,
    cooldownUntil: 0,
    lastCallTimestamp: 0,
  };
  return readJsonWithFallback<McpLockRecord>(LOCK_KEY, defaultLock);
}

export function writeLockRecord(lock: McpLockRecord): void {
  atomicWriteJson(LOCK_KEY, lock);
}

/**
 * Atomically acquire distributed rate-limit lock.
 * Strictly separates:
 * 1. Cooldown lock (60 seconds)
 * 2. In-flight execution lock (15 seconds) with unique owner token
 */
export async function acquireDistributedLock(): Promise<{
  acquired: boolean;
  ownerToken?: string;
  retryAfterSeconds?: number;
  error?: string;
  engine: string;
}> {
  const engine = detectStorageEngine();
  const now = Date.now();
  const ownerToken = `owner_${now}_${Math.random().toString(36).substring(2, 9)}`;

  // 1. Try Vercel KV REST if available
  if (engine === 'vercel_kv') {
    // Check cooldown first
    const cooldownTtlRes = await kvRestCall<number>('ttl', 'questathon:mcp:cooldown');
    if (cooldownTtlRes.ok && typeof cooldownTtlRes.result === 'number' && cooldownTtlRes.result > 0) {
      return {
        acquired: false,
        retryAfterSeconds: cooldownTtlRes.result,
        error: `Rate limit in effect: token allows 1 call per minute. Cooldown active for ${cooldownTtlRes.result}s.`,
        engine: 'vercel_kv',
      };
    }

    // Try acquiring in-flight lock atomically with 15s timeout
    const inFlightSetRes = await kvRestCall<string>('set', 'questathon:mcp:inflight', ownerToken, 'ex', 15, 'nx');
    if (!inFlightSetRes.ok || inFlightSetRes.result !== 'OK') {
      const inFlightTtlRes = await kvRestCall<number>('ttl', 'questathon:mcp:inflight');
      const waitSec = Math.max(1, typeof inFlightTtlRes.result === 'number' ? inFlightTtlRes.result : 15);
      return {
        acquired: false,
        retryAfterSeconds: waitSec,
        error: `Another MCP call is currently in flight across serverless instances. Wait ${waitSec}s.`,
        engine: 'vercel_kv',
      };
    }

    // Reserve 61-second cooldown immediately upon acquisition
    await kvRestCall<string>('set', 'questathon:mcp:cooldown', String(now), 'ex', 61);

    return { acquired: true, ownerToken, engine: 'vercel_kv' };
  }

  // 2. Atomic File-Based Lock (local fallback)
  const currentLock = readLockRecord();

  // In-flight concurrency check: lock active and not expired (15 second timeout)
  const inFlight = Boolean(currentLock.inFlightInstanceId && now < currentLock.inFlightUntil);
  if (inFlight) {
    const waitSec = Math.ceil((currentLock.inFlightUntil - now) / 1000);
    return {
      acquired: false,
      retryAfterSeconds: waitSec,
      error: `Another MCP call is currently in flight (${currentLock.inFlightInstanceId}). Parallel calls are strictly forbidden.`,
      engine: 'atomic_file_store',
    };
  }

  // Rate limit cooldown check: 60-second rule
  if (now < currentLock.cooldownUntil) {
    const waitSec = Math.ceil((currentLock.cooldownUntil - now) / 1000);
    return {
      acquired: false,
      retryAfterSeconds: waitSec,
      error: `Rate limit in effect: token allows 1 call per minute. Try again in ${waitSec}s.`,
      engine: 'atomic_file_store',
    };
  }

  // Reserve lock BEFORE dispatching request
  const reservedLock: McpLockRecord = {
    inFlightInstanceId: ownerToken,
    inFlightUntil: now + 15000,
    cooldownUntil: now + 61000,
    lastCallTimestamp: now,
  };
  writeLockRecord(reservedLock);

  return { acquired: true, ownerToken, engine: 'atomic_file_store' };
}

/**
 * Release in-flight lock safely with atomic compare-and-delete.
 * Uses Redis Lua script in Vercel KV to guarantee atomic ownership check and deletion.
 */
export async function releaseDistributedLock(ownerToken?: string, cooldownSeconds = 61): Promise<void> {
  const now = Date.now();

  if (detectStorageEngine() === 'vercel_kv') {
    try {
      // Atomic Lua script compare-and-delete:
      // Deletes questathon:mcp:inflight ONLY IF its current value equals ownerToken
      if (ownerToken) {
        const luaScript = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
        await kvRestCall('eval', luaScript, 1, 'questathon:mcp:inflight', ownerToken);
      } else {
        await kvRestCall('del', 'questathon:mcp:inflight');
      }

      // Update cooldown key
      if (cooldownSeconds === 0) {
        await kvRestCall('del', 'questathon:mcp:cooldown');
      } else {
        await kvRestCall('set', 'questathon:mcp:cooldown', String(now), 'ex', cooldownSeconds);
      }
    } catch (e) {
      console.error('Failed updating lock in Vercel KV:', e);
    }
  }

  const current = readLockRecord();

  // In atomic file store, unlock in-flight status only if matching owner
  const shouldClearInFlight = !ownerToken || current.inFlightInstanceId === ownerToken;
  const updatedLock: McpLockRecord = {
    ...current,
    inFlightInstanceId: shouldClearInFlight ? '' : current.inFlightInstanceId,
    inFlightUntil: shouldClearInFlight ? 0 : current.inFlightUntil,
    lastCallTimestamp: now,
    cooldownUntil: cooldownSeconds === 0 ? 0 : Math.max(current.cooldownUntil, now + cooldownSeconds * 1000),
  };
  writeLockRecord(updatedLock);
}

/**
 * Release in-flight flag after error while preserving rate limit cooldown
 */
export async function releaseDistributedLockOnError(ownerToken?: string, retryAfterSeconds = 61): Promise<void> {
  const now = Date.now();

  if (detectStorageEngine() === 'vercel_kv') {
    try {
      if (ownerToken) {
        const luaScript = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
        await kvRestCall('eval', luaScript, 1, 'questathon:mcp:inflight', ownerToken);
      } else {
        await kvRestCall('del', 'questathon:mcp:inflight');
      }

      await kvRestCall('set', 'questathon:mcp:cooldown', String(now), 'ex', retryAfterSeconds);
    } catch (e) {
      console.error('Failed setting cooldown in Vercel KV on error:', e);
    }
  }

  const current = readLockRecord();
  const shouldClearInFlight = !ownerToken || current.inFlightInstanceId === ownerToken;

  const updatedLock: McpLockRecord = {
    ...current,
    inFlightInstanceId: shouldClearInFlight ? '' : current.inFlightInstanceId,
    inFlightUntil: shouldClearInFlight ? 0 : current.inFlightUntil,
    cooldownUntil: Math.max(current.cooldownUntil, now + retryAfterSeconds * 1000),
  };
  writeLockRecord(updatedLock);
}

/**
 * Asynchronously query rate limit status.
 * Distinguishes in-flight execution from cooldown window.
 */
export async function getRateLimitStatusAsync(): Promise<{
  canCallNow: boolean;
  secondsRemaining: number;
  inFlight: boolean;
  storageEngine: string;
}> {
  if (detectStorageEngine() === 'vercel_kv') {
    try {
      const inFlightTtl = await kvRestCall<number>('ttl', 'questathon:mcp:inflight');
      if (inFlightTtl.ok && typeof inFlightTtl.result === 'number' && inFlightTtl.result > 0) {
        return {
          canCallNow: false,
          secondsRemaining: inFlightTtl.result,
          inFlight: true,
          storageEngine: 'vercel_kv',
        };
      }

      const cooldownTtl = await kvRestCall<number>('ttl', 'questathon:mcp:cooldown');
      if (cooldownTtl.ok && typeof cooldownTtl.result === 'number' && cooldownTtl.result > 0) {
        return {
          canCallNow: false,
          secondsRemaining: cooldownTtl.result,
          inFlight: false,
          storageEngine: 'vercel_kv',
        };
      }

      return {
        canCallNow: true,
        secondsRemaining: 0,
        inFlight: false,
        storageEngine: 'vercel_kv',
      };
    } catch (_) {}
  }

  return getRateLimitStatus();
}

export function getRateLimitStatus(): {
  canCallNow: boolean;
  secondsRemaining: number;
  inFlight: boolean;
  storageEngine: string;
} {
  const lock = readLockRecord();
  const now = Date.now();
  const inFlight = Boolean(lock.inFlightInstanceId && now < lock.inFlightUntil);

  if (inFlight) {
    const remaining = Math.ceil((lock.inFlightUntil - now) / 1000);
    return {
      canCallNow: false,
      secondsRemaining: remaining,
      inFlight: true,
      storageEngine: detectStorageEngine(),
    };
  }

  if (now < lock.cooldownUntil) {
    const remaining = Math.ceil((lock.cooldownUntil - now) / 1000);
    return {
      canCallNow: false,
      secondsRemaining: remaining,
      inFlight: false,
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
// ATOMIC PER-RECORD NOTES PERSISTENCE
// Uses Redis Hash (HSET, HGET, HVALS, HLEN) to guarantee
// no race condition or overwrite between concurrent notes!
// ==========================================

export function getStoredNotes(): CRMNote[] {
  const data = readJsonWithFallback<{ notes: CRMNote[] }>(NOTES_KEY, { notes: [] });
  return data.notes || [];
}

export async function getStoredNotesAsync(): Promise<CRMNote[]> {
  if (detectStorageEngine() === 'vercel_kv') {
    try {
      const res = await kvRestCall<string[]>('hvals', 'questathon:notes:hash');
      if (res.ok && Array.isArray(res.result)) {
        // Successful response from Redis!
        if (res.result.length === 0) {
          // Check for legacy migration on first initialization
          const legacyRes = await kvRestCall<any>('get', 'questathon:notes');
          if (legacyRes.ok && legacyRes.result) {
            const legacyParsed = typeof legacyRes.result === 'string' ? JSON.parse(legacyRes.result) : legacyRes.result;
            const notesList: CRMNote[] = Array.isArray(legacyParsed) ? legacyParsed : legacyParsed.notes || [];
            if (notesList.length > 0) {
              for (const n of notesList) {
                await kvRestCall('hset', 'questathon:notes:hash', n.id, JSON.stringify(n));
              }
              return notesList;
            }
          }
          // The distributed KV store is legitimately empty; do NOT read stale local fallback files!
          return [];
        }

        const parsed = res.result
          .map((item) => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item;
            } catch (_) {
              return null;
            }
          })
          .filter(Boolean) as CRMNote[];

        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return parsed;
      }

      lastRecordedKvError = res.error || 'KV HVALS failed';
    } catch (e: any) {
      console.error('Failed reading notes from Vercel KV hash, using local store:', e);
      lastRecordedKvError = e?.message;
    }
  }

  return getStoredNotes();
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

/**
 * Atomically store note using Redis HSET per record.
 * Two concurrent notes will each set their own field without overwriting the other!
 */
export async function saveStoredNoteAsync(note: CRMNote): Promise<{ success: boolean; error?: string }> {
  saveStoredNote(note);

  if (detectStorageEngine() === 'vercel_kv') {
    const res = await kvRestCall<number>('hset', 'questathon:notes:hash', note.id, JSON.stringify(note));
    if (!res.ok) {
      console.error('Vercel KV HSET note failed:', res.error);
      lastRecordedKvError = res.error;
      return { success: false, error: res.error };
    }
    return { success: true };
  }

  return { success: true };
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

export async function updateStoredNoteStatusAsync(
  noteId: string,
  status: 'synced' | 'saved_locally_pending' | 'pending_retry',
  confirmedAt?: string,
  remoteError?: string,
  retryIncrement = false
): Promise<{ success: boolean; error?: string }> {
  updateStoredNoteStatus(noteId, status, confirmedAt, remoteError);

  if (detectStorageEngine() === 'vercel_kv') {
    try {
      const getRes = await kvRestCall<string>('hget', 'questathon:notes:hash', noteId);
      if (getRes.ok && getRes.result) {
        const note: CRMNote = typeof getRes.result === 'string' ? JSON.parse(getRes.result) : getRes.result;
        note.syncStatus = status;
        if (confirmedAt) note.remoteConfirmedAt = confirmedAt;
        if (remoteError) note.remoteError = remoteError;
        if (retryIncrement) {
          note.retryCount = (note.retryCount || 0) + 1;
          note.lastAttemptAt = new Date().toISOString();
        }
        const setRes = await kvRestCall('hset', 'questathon:notes:hash', noteId, JSON.stringify(note));
        if (!setRes.ok) return { success: false, error: setRes.error };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  }

  return { success: true };
}

export async function getPendingNotesAsync(): Promise<CRMNote[]> {
  const notes = await getStoredNotesAsync();
  return notes.filter((n) => n.syncStatus === 'saved_locally_pending' || n.syncStatus === 'pending_retry');
}

// ==========================================
// ATOMIC PER-RECORD SIGNALS PERSISTENCE
// Uses Redis HSETNX for atomic insertion and deduplication!
// ==========================================

export function getStoredSignals(): LiveSignal[] {
  const data = readJsonWithFallback<{ signals: LiveSignal[] }>(SIGNALS_KEY, { signals: [] });
  return data.signals || [];
}

export async function getStoredSignalsAsync(): Promise<LiveSignal[]> {
  if (detectStorageEngine() === 'vercel_kv') {
    try {
      const res = await kvRestCall<string[]>('hvals', 'questathon:signals:hash');
      if (res.ok && Array.isArray(res.result)) {
        // Successful response from Redis!
        if (res.result.length === 0) {
          return [];
        }

        const parsed = res.result
          .map((item) => {
            try {
              return typeof item === 'string' ? JSON.parse(item) : item;
            } catch (_) {
              return null;
            }
          })
          .filter(Boolean) as LiveSignal[];

        parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return parsed;
      }

      lastRecordedKvError = res.error || 'KV signals HVALS failed';
    } catch (e: any) {
      console.error('Failed reading signals from Vercel KV hash, using local store:', e);
      lastRecordedKvError = e?.message;
    }
  }

  return getStoredSignals();
}

/**
 * Deduplicate and save signal using atomic Redis HSETNX.
 * Returns true if new signal was inserted; false if duplicate already existed.
 */
export function saveStoredSignal(signal: LiveSignal): boolean {
  const signals = getStoredSignals();
  const compositeKey =
    signal.id && signal.id.trim() !== ''
      ? signal.id
      : `${signal.sourceId || 'signal'}_${signal.timestamp || Date.now()}`;

  const exists = signals.some((s) => {
    const existingKey = s.id && s.id.trim() !== '' ? s.id : `${s.sourceId || 'signal'}_${s.timestamp}`;
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

export async function saveStoredSignalAsync(signal: LiveSignal): Promise<boolean> {
  const localInserted = saveStoredSignal(signal);

  if (detectStorageEngine() === 'vercel_kv') {
    const compositeKey =
      signal.id && signal.id.trim() !== ''
        ? signal.id
        : `${signal.sourceId || 'signal'}_${signal.timestamp || Date.now()}`;

    // HSETNX atomically sets field ONLY IF it does not exist yet! Returns 1 if set, 0 if exists.
    const res = await kvRestCall<number>('hsetnx', 'questathon:signals:hash', compositeKey, JSON.stringify(signal));
    if (!res.ok) {
      lastRecordedKvError = res.error;
      return localInserted;
    }
    return res.result === 1;
  }

  return localInserted;
}

// ==========================================
// ACTIVE STORAGE HEALTH CHECK & DIAGNOSTICS
// ==========================================

export function getStorageDiagnostics(): StorageDiagnostics {
  const notes = getStoredNotes();
  const signals = getStoredSignals();
  const pending = notes.filter((n) => n.syncStatus !== 'synced');
  const rate = getRateLimitStatus();
  const engine = detectStorageEngine();

  const isDistributed = engine === 'vercel_kv';
  const engineDescription =
    engine === 'vercel_kv'
      ? 'Vercel KV REST (Multi-instance atomic hash store active across cold starts)'
      : 'Local Atomic File Store (Single-node fallback for dev; configure KV_REST_API_URL on Vercel for multi-instance distributed persistence)';

  return {
    engine,
    engineDescription,
    isDistributed,
    kvConnected: isDistributed && !lastRecordedKvError,
    status: isDistributed && lastRecordedKvError ? 'degraded_local_fallback' : 'healthy',
    notesCount: notes.length,
    signalsCount: signals.length,
    pendingNotesCount: pending.length,
    isLocked: rate.inFlight || !rate.canCallNow,
    secondsRemaining: rate.secondsRemaining,
    inFlight: rate.inFlight,
    lastKvError: lastRecordedKvError,
  };
}

/**
 * Asynchronously query diagnostics with an ACTIVE Redis ping health probe.
 * Never reports healthy distributed persistence based only on configured environment variables.
 */
export async function getStorageDiagnosticsAsync(): Promise<StorageDiagnostics> {
  const engine = detectStorageEngine();

  if (engine === 'vercel_kv') {
    // 1. Actively probe KV health
    const pingRes = await kvRestCall<string>('ping');
    const isHealthy = pingRes.ok && (pingRes.result === 'PONG' || typeof pingRes.result === 'string');

    if (!isHealthy) {
      const activeError = pingRes.error || 'KV ping health probe failed';
      lastRecordedKvError = activeError;
      const localDiag = getStorageDiagnostics();
      return {
        ...localDiag,
        engine: 'vercel_kv',
        isDistributed: true,
        kvConnected: false,
        status: 'degraded_local_fallback',
        lastKvError: activeError,
      };
    }

    try {
      const [notes, signals, rate] = await Promise.all([
        getStoredNotesAsync(),
        getStoredSignalsAsync(),
        getRateLimitStatusAsync(),
      ]);

      const pending = notes.filter((n) => n.syncStatus !== 'synced');
      lastRecordedKvError = undefined;

      return {
        engine: 'vercel_kv',
        engineDescription: 'Vercel KV REST (Multi-instance atomic hash store active across cold starts)',
        isDistributed: true,
        kvConnected: true,
        status: 'healthy',
        notesCount: notes.length,
        signalsCount: signals.length,
        pendingNotesCount: pending.length,
        isLocked: rate.inFlight || !rate.canCallNow,
        secondsRemaining: rate.secondsRemaining,
        inFlight: rate.inFlight,
        lastKvError: undefined,
      };
    } catch (err: any) {
      lastRecordedKvError = err?.message;
    }
  }

  return getStorageDiagnostics();
}
