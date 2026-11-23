// One row per job in the night's run log, plus how the read went.
// `owner` keeps the raw value (`null` stays `null`; views render it as `—`).

export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  rows: DigestRow[];
  badLines: number;
};

// Reads `runs/<night>.jsonl` into rows sorted by job.
// Unparsable lines are counted in `badLines`, never thrown.
export declare function readNight(runsDir: string, night: string): Night;

