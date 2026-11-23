import { accessSync, readFileSync } from 'node:fs';
import type { DigestRow, Night, RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

type Line = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One line is trusted only after it checks out; bad lines never reach the rows.
function parseLine(raw: string): Line | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const { at, job, status, owner, error } = parsed as Record<string, unknown>;
  if (typeof at !== 'string' || typeof job !== 'string') return null;
  if (!STATUSES.includes(status as RunStatus)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return { at, job, status: status as RunStatus, owner, ...(error !== undefined ? { error } : {}) };
}

// A night exists only if its log file does; the route 404s before reading.
export function nightExists(runsDir: string, night: string): boolean {
  try {
    accessSync(`${runsDir}/${night}.jsonl`);
    return true;
  } catch {
    return false;
  }
}

export function readNight(runsDir: string, night: string): Night {
  let text: string;
  try {
    text = readFileSync(`${runsDir}/${night}.jsonl`, 'utf8');
  } catch {
    return { rows: [], badLines: 0 };
  }

  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const parsed = parseLine(line);
    if (parsed === null) {
      badLines += 1;
      continue;
    }
    const { at, job, status, owner, error } = parsed;
    const existing = byJob.get(job);
    if (existing === undefined) {
      byJob.set(job, {
        job,
        owner,
        runs: 1,
        retries: status === 'retry' ? 1 : 0,
        lastStatus: status,
        lastError: error ?? null,
        firstAt: at,
        lastAt: at,
      });
      continue;
    }
    existing.runs += 1;
    if (status === 'retry') existing.retries += 1;
    existing.lastStatus = status;
    existing.lastError = error ?? null;
    existing.lastAt = at;
  }

  const rows = [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job));
  return { rows, badLines };
}
