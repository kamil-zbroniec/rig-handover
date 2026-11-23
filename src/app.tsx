import { existsSync } from 'node:fs';
import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/readNight.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  // Same reader as the digest page, so the JSON and the page cannot disagree (ADR 0001).
  // A night with no file 404s; an empty file yields the empty rows shape.
  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!existsSync(`${config.runsDir}/${night}.jsonl`)) {
      return c.json({ error: 'night not found' }, 404);
    }
    return c.json(readNight(config.runsDir, night));
  });

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  return app;
}
