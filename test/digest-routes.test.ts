import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Contract tests for the digest routes (#2 HTML, #3 JSON). Written against the plan: they pass
// once both routes land on main. Everything runs against a temp runs dir; runs/ stays untouched.

const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });

function writeNight(night: string, lines: string[]) {
  writeFileSync(join(dir, `${night}.jsonl`), lines.join('\n') + (lines.length > 0 ? '\n' : ''));
}

beforeEach(() => {
  writeNight('2026-10-28', [
    '{"at":"2026-10-28T23:00:06+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
    '{"at":"2026-10-29T05:00:04+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"timeout"}',
    '{"at":"2026-10-29T05:00:05+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
    '{"at":"2026-10-29T04:00:01+01:00","job":"notes/backup","status":"fail","owner":null,"error":"quota exceeded"}',
  ]);
  writeNight('2026-10-29', []);
  writeNight('2026-10-30', ['not json at all']);
});

describe('GET /digest/:night (HTML)', () => {
  it('shows the night with one row per job, sorted', async () => {
    const res = await app.request('/digest/2026-10-28');
    expect(res.status).toBe(200);
    const html = await res.text();
    const sync = html.indexOf('lane/sync');
    const backup = html.indexOf('notes/backup');
    expect(sync).toBeGreaterThan(-1);
    expect(backup).toBeGreaterThan(-1);
    expect(sync).toBeLessThan(backup);
    expect(html).toContain('3');
    expect(html).toContain('quota exceeded');
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/digest/9999-99-99');
    expect(res.status).toBe(404);
  });

  it('renders the empty night as nothing ran, still 200', async () => {
    const res = await app.request('/digest/2026-10-29');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('lane/sync');
  });

  it('is still 200 for a night with a bad line', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/digest/:night (JSON)', () => {
  it('answers with the night: rows sorted by job plus badLines', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      rows: [
        {
          job: 'lane/sync',
          owner: 'rook',
          runs: 3,
          retries: 1,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-10-28T23:00:06+01:00',
          lastAt: '2026-10-29T05:00:05+01:00',
        },
        {
          job: 'notes/backup',
          owner: null,
          runs: 1,
          retries: 0,
          lastStatus: 'fail',
          lastError: 'quota exceeded',
          firstAt: '2026-10-29T04:00:01+01:00',
          lastAt: '2026-10-29T04:00:01+01:00',
        },
      ],
      badLines: 0,
    });
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/api/digest/9999-99-99');
    expect(res.status).toBe(404);
  });

  it('answers with an empty night for the empty file', async () => {
    const res = await app.request('/api/digest/2026-10-29');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [], badLines: 0 });
  });

  it('is still 200 and counts the bad line for a night with one', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rows: [], badLines: 1 });
  });
});
