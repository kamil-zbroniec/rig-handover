import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/readNight.js';

// The real night: read-only fixture, 16 lines, 5 jobs, 1 bad (truncated) line.
const fixture = readNight('runs', '2026-10-28');

describe('readNight on the real fixture', () => {
  it('makes one row per job, sorted by job', () => {
    expect(fixture.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts the bad line instead of throwing', () => {
    expect(fixture.badLines).toBe(1);
  });

  it('aggregates each job', () => {
    expect(fixture.rows).toEqual([
      {
        job: 'digest/render',
        owner: null,
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T05:41:09+01:00',
        lastAt: '2026-10-29T05:41:09+01:00',
      },
      {
        job: 'fixtures/refresh',
        owner: 'rook',
        runs: 4,
        retries: 3,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-29T01:30:00+01:00',
        lastAt: '2026-10-29T01:37:00+01:00',
      },
      {
        job: 'lane/sync',
        owner: 'rook',
        runs: 8,
        retries: 1,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:06+01:00',
        lastAt: '2026-10-29T05:00:04+01:00',
      },
      {
        job: 'notes/backup',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'quota exceeded',
        firstAt: '2026-10-29T04:00:01+01:00',
        lastAt: '2026-10-29T04:00:01+01:00',
      },
      {
        job: 'rig/rotate-logs',
        owner: 'lane-07',
        runs: 1,
        retries: 0,
        lastStatus: 'ok',
        lastError: null,
        firstAt: '2026-10-28T23:00:02+01:00',
        lastAt: '2026-10-28T23:00:02+01:00',
      },
    ]);
  });
});

describe('readNight on edge cases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('renders an empty night as no rows and no bad lines', () => {
    writeFileSync(join(dir, '2026-10-28.jsonl'), '');
    expect(readNight(dir, '2026-10-28')).toEqual({ rows: [], badLines: 0 });
  });

  it('returns an empty night when the file is missing', () => {
    expect(readNight(dir, '1999-01-01')).toEqual({ rows: [], badLines: 0 });
  });

  it('counts every unparsable line, once each', () => {
    writeFileSync(join(dir, '2026-10-28.jsonl'), 'not json\n{"at":1}\n\n');
    expect(readNight(dir, '2026-10-28')).toEqual({ rows: [], badLines: 2 });
  });
});
