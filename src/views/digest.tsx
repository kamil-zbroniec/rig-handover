import type { Night } from '../digest/types.js';

// Missing data renders as `—`, times keep the offset from the log (styleguide).
const or = (value: string | null) => value ?? '—';

export function Digest({ night }: { night: Night }) {
  if (night.rows.length === 0) return <p class="mute">nothing ran</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>job</th>
          <th>owner</th>
          <th>runs</th>
          <th>retries</th>
          <th>last status</th>
          <th>last error</th>
          <th>first at</th>
          <th>last at</th>
        </tr>
      </thead>
      <tbody>
        {night.rows.map((row) => (
          <tr>
            <td>{row.job}</td>
            <td>{or(row.owner)}</td>
            <td>{row.runs}</td>
            {/* rows arrive sorted by job; only the loud cells get the color */}
            <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
            <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
            <td>{or(row.lastError)}</td>
            <td>{row.firstAt}</td>
            <td>{row.lastAt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
