import { existsSync } from 'node:fs';
import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { nightExists, readNight } from './digest/readNight.js';
import { Digest } from './views/digest.js';
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

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!nightExists(config.runsDir, night)) return c.text('no such night\n', 404);
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <h1>digest · {night}</h1>
        <Digest night={readNight(config.runsDir, night)} />
      </Layout>,
    );
  });

  return app;
}
