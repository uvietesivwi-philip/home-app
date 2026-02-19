import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('web app pages are served successfully', async () => {
  const port = 4173;
  const server = spawn('python', ['-m', 'http.server', String(port)], {
    cwd: process.cwd(),
    stdio: 'ignore'
  });

  try {
    await wait(700);
    const [homeResponse, adminResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/web/`),
      fetch(`http://127.0.0.1:${port}/web/admin.html`)
    ]);

    assert.equal(homeResponse.status, 200);
    assert.equal(adminResponse.status, 200);
  } finally {
    server.kill('SIGTERM');
  }
});
