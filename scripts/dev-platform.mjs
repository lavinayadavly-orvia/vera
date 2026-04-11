import { spawn } from 'node:child_process';

const backendPort = process.env.VERA_API_PORT || process.env.DND_API_PORT || '8787';
const backendUrl = process.env.VITE_BACKEND_API_URL || `http://127.0.0.1:${backendPort}`;

function spawnProcess(command, args, extraEnv = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

const api = spawnProcess('node', ['server/index.mjs'], {
  VERA_API_PORT: backendPort,
});

const web = spawnProcess('npm', ['run', 'dev'], {
  VITE_BACKEND_API_URL: backendUrl,
});

function shutdown(code = 0) {
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  process.exit(code);
}

api.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`Vera API exited with code ${code}`);
    shutdown(code);
  }
});

web.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`Vera web app exited with code ${code}`);
    shutdown(code);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
