// Runs the API and Vite side by side with prefixed output. Replaces `concurrently`
// (which pulled in a vulnerable shell-quote) with zero dependencies.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

const tasks = [
  { name: 'api', color: 34, script: 'dev:api' },
  { name: 'web', color: 35, script: 'dev:web' },
];

let stopping = false;
const children: ChildProcess[] = [];

function stopAll(code: number): void {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null || child.pid === undefined) continue;
    // On Windows, child.kill() only kills the cmd.exe wrapper; kill the whole tree.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    else child.kill('SIGTERM');
  }
  process.exitCode = code;
}

for (const { name, color, script } of tasks) {
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const child = spawn(`npm run ${script}`, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding('utf8');
    stream.on('data', (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) if (line) process.stdout.write(prefix + line + '\n');
    });
  }
  child.on('exit', (code) => {
    if (!stopping) console.log(`${prefix}exited with code ${code}; stopping the rest`);
    stopAll(code ?? 0);
  });
  children.push(child);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
