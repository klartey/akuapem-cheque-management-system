// Database layer for the Cheque Management System.
// Uses Postgres via `pg` when DATABASE_URL is set (Supabase / production on Vercel),
// otherwise an in-process PGlite instance persisted to disk (local dev + single-host).
// Both expose the same async query/tx interface, so the rest of the app is storage-agnostic.
const path = require('node:path');
const fs = require('node:fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
let _kind = null, _pool = null, _pglite = null, _ready = null;

async function init() {
  if (_ready) return _ready;
  _ready = (async () => {
    if (process.env.DATABASE_URL) {
      const { Pool } = require('pg');
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.PG_POOL_MAX || 3),
        idleTimeoutMillis: 10000,
        ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
      });
      _kind = 'pg';
    } else {
      const { PGlite } = await import('@electric-sql/pglite');
      fs.mkdirSync(path.join(dataDir, 'pgdata'), { recursive: true });
      _pglite = new PGlite(path.join(dataDir, 'pgdata'));
      await _pglite.waitReady;
      _kind = 'pglite';
    }
    await schema();
  })();
  return _ready;
}

// Run a query, returning rows. $1..$n params on both backends.
async function query(sql, params) {
  await init();
  if (_kind === 'pg') return (await _pool.query(sql, params)).rows;
  return (await _pglite.query(sql, params)).rows;
}

// Run fn inside a transaction; fn receives a query function q(sql, params) -> rows.
async function tx(fn) {
  await init();
  if (_kind === 'pg') {
    const c = await _pool.connect();
    try {
      await c.query('begin');
      const out = await fn((s, p) => c.query(s, p).then(r => r.rows));
      await c.query('commit');
      return out;
    } catch (e) { await c.query('rollback'); throw e; }
    finally { c.release(); }
  }
  return _pglite.transaction(async t => fn((s, p) => t.query(s, p).then(r => r.rows)));
}

async function schema() {
  const q = _kind === 'pg' ? (s, p) => _pool.query(s, p) : (s, p) => _pglite.query(s, p);
  await q(`create table if not exists app_state(id int primary key, data jsonb not null)`);
  try { await q(`alter table app_state add column if not exists version bigint not null default 0`); } catch (e) { /* older backends */ }
  await q(`create table if not exists business_audit(
    id bigserial primary key, ts text not null, action text not null,
    ref text, actor text, role text, branch text, remarks text, created_at timestamptz not null default now())`);
  await q(`create index if not exists idx_bizaudit_id on business_audit(id desc)`);
  await q(`create table if not exists credentials(id text primary key, salt text not null, hash text not null)`);
  await q(`create table if not exists config(key text primary key, value jsonb not null)`);
  await q(`create table if not exists customers(
    account text primary key, name text, name_lc text, phone text,
    branch text, type text, status text, source text, updated text)`);
  await q(`create table if not exists system_log(
    id bigserial primary key, ts timestamptz not null default now(),
    level text not null, event text not null, actor text, ip text, detail text)`);
  await q(`create table if not exists password_reset(
    uid text primary key, code_hash text not null,
    expires bigint not null, attempts int not null default 0, created_at bigint not null)`);
  await q(`create index if not exists idx_syslog_ts on system_log(ts desc)`);
  await q(`create index if not exists idx_syslog_level on system_log(level)`);
  await q(`create index if not exists idx_syslog_event on system_log(event)`);
  // Lock the tables away from the Supabase public REST API. The app connects as the
  // postgres role (bypasses RLS), so this only denies the anon/authenticated PostgREST
  // roles — PII (customers) and password hashes (credentials) are never web-exposed.
  for (const t of ['app_state', 'credentials', 'config', 'customers', 'system_log', 'password_reset', 'business_audit']) {
    try { await q(`alter table ${t} enable row level security`); } catch (e) { /* not supported (PGlite) — no PostgREST there anyway */ }
  }
  // Fast fuzzy search where the extension exists (Supabase). Harmless if unavailable (PGlite falls back to a scan).
  try {
    await q(`create extension if not exists pg_trgm`);
    await q(`create index if not exists idx_cust_name_trgm on customers using gin (name_lc gin_trgm_ops)`);
    await q(`create index if not exists idx_cust_acct_trgm on customers using gin (account gin_trgm_ops)`);
  } catch (e) { /* no pg_trgm (e.g. PGlite) — sequential scan is fine at this scale */ }
}

function backend() { return _kind || (process.env.DATABASE_URL ? 'pg' : 'pglite'); }

module.exports = { init, query, tx, backend };
