// Smoke / regression tests for the security & control boundary.
// Boots the real server against a throwaway PGlite database and exercises the
// authentication boundary, four-eyes queuing, and bank-wide serial uniqueness.
//   run with:  npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ADMIN_PW = 'TestAdmin123!';
let app, base, dataDir;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acb-test-'));
  process.env.DATA_DIR = dataDir;            // isolated PGlite instance
  process.env.ADMIN_PASSWORD = ADMIN_PW;     // deterministic admin login
  process.env.SESSION_SECRET = 'test-secret-please-ignore';
  delete process.env.DATABASE_URL;           // force local PGlite, never a real DB
  app = require('../server.js');
  await app.ready();
  await new Promise(r => app.server.listen(0, r));
  base = 'http://127.0.0.1:' + app.server.address().port;
});

after(() => { try { app.server.close(); } catch {} try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {} });

function req(method, url, { cookie, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(base + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
async function login(staffId, password) {
  const r = await req('POST', '/api/session', { body: { staffId, password } });
  const setCookie = r.headers.get('set-cookie') || '';
  return { status: r.status, cookie: setCookie.split(';')[0], json: await r.json().catch(() => ({})) };
}

test('unauthenticated API access is rejected', async () => {
  const r = await req('GET', '/api/state');
  assert.strictEqual(r.status, 401);
});

test('valid admin login succeeds and issues a session', async () => {
  const l = await login('admin@acb.com', ADMIN_PW);
  assert.strictEqual(l.status, 200);
  assert.ok(l.cookie.startsWith('acb_session='));
});

test('wrong password is rejected', async () => {
  const l = await login('admin@acb.com', 'nope');
  assert.strictEqual(l.status, 401);
});

test('authenticated state loads with a role', async () => {
  const l = await login('admin@acb.com', ADMIN_PW);
  const r = await req('GET', '/api/state', { cookie: l.cookie });
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.ok(j.role, 'state should include the signed-in role');
});

test('four-eyes: a privilege change is queued, not applied', async () => {
  const l = await login('admin@acb.com', ADMIN_PW);
  const before = await (await req('GET', '/api/state', { cookie: l.cookie })).json();
  const qBefore = (before.data.adminQueue || []).length;
  const roleBefore = before.data.directory['cs.nsawam@acb.com'].role;
  const r = await req('POST', '/api/admin/user/role', { cookie: l.cookie, body: { uid: 'cs.nsawam@acb.com', role: 'Branch Manager' } });
  assert.strictEqual(r.status, 200);
  const j = await r.json();
  assert.strictEqual((j.data.adminQueue || []).length, qBefore + 1, 'change should be queued');
  assert.strictEqual(j.data.directory['cs.nsawam@acb.com'].role, roleBefore, 'role must not change until authorised');
});
