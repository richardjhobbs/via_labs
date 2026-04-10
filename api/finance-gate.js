// ─────────────────────────────────────────────────────────
// /api/finance-gate — password gate for /finance/{admin,investor}
//
// Flow:
//   GET  /finance/admin     → rewritten to /api/finance-gate?level=admin
//   GET  /finance/investor  → rewritten to /api/finance-gate?level=investor
//
//   If a valid cookie is present, the real HTML file is streamed back.
//   Otherwise a small login form is returned.
//
//   POST /api/finance-gate?level=admin  (password form submission)
//     → on success: sets finance_session cookie, 302 to /finance/{level}
//     → on failure: re-renders login form with error
//
// Access model: admin unlocks both. Cookie value encodes the highest level
// the user authenticated to; /finance/admin accepts level=admin only,
// /finance/investor accepts any valid cookie.
//
// Env vars (required in Vercel):
//   FINANCE_ADMIN_PASSWORD
//   FINANCE_INVESTOR_PASSWORD
//   FINANCE_COOKIE_SECRET    (32+ random bytes, used for HMAC)
// ─────────────────────────────────────────────────────────

import crypto from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const COOKIE_NAME = 'finance_session';
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret() {
  const s = process.env.FINANCE_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error('FINANCE_COOKIE_SECRET not set (min 16 chars)');
  }
  return s;
}

function sign(payload) {
  // payload: "level.issuedAt"
  const h = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${h}`;
}

function verify(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [level, issuedAt, sig] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${level}.${issuedAt}`).digest('base64url');
  // constant-time compare
  let ok = false;
  try {
    ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch { ok = false; }
  if (!ok) return null;
  const age = Date.now() / 1000 - Number(issuedAt);
  if (age > COOKIE_MAX_AGE || age < 0) return null;
  if (level !== 'admin' && level !== 'investor') return null;
  return { level, issuedAt: Number(issuedAt) };
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

// Parse url-encoded form body. Vercel normally gives us req.body already.
function getFormValue(req, key) {
  if (req.body && typeof req.body === 'object') return req.body[key];
  if (typeof req.body === 'string') {
    const params = new URLSearchParams(req.body);
    return params.get(key);
  }
  return undefined;
}

function hasAccess(session, requiredLevel) {
  if (!session) return false;
  if (requiredLevel === 'investor') return true; // any valid session
  if (requiredLevel === 'admin' && session.level === 'admin') return true;
  return false;
}

function loginPageHtml(level, error) {
  const title = level === 'admin' ? 'VIA Labs Finance — Admin' : 'VIA Labs Finance — Investor';
  const label = level === 'admin' ? 'Admin access' : 'Investor access';
  const errorHtml = error ? `<p class="gate-error">${error}</p>` : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="robots" content="noindex, nofollow" />
<link rel="icon" href="/favicon.ico" />
<link rel="stylesheet" href="/via.css" />
<link rel="stylesheet" href="/finance.css" />
</head><body>
<main class="gate-wrap">
  <div class="gate-card">
    <div class="gate-eyebrow">${label}</div>
    <h1 class="gate-title">Finance</h1>
    <p class="gate-sub">This area is restricted. Enter the password to continue.</p>
    <form method="POST" action="/api/finance-gate?level=${level}" autocomplete="off">
      <input type="password" name="password" class="gate-input" placeholder="Password" autofocus required />
      <button type="submit" class="gate-submit">Enter</button>
    </form>
    ${errorHtml}
    <a href="/finance" class="gate-back">← Back to finance overview</a>
  </div>
</main>
</body></html>`;
}

function serveHtml(res, level) {
  // Path: finance/admin.html or finance/investor.html
  const file = level === 'admin' ? 'admin.html' : 'investor.html';
  const htmlPath = join(__dirname, '..', 'finance', file);
  let html;
  try {
    html = readFileSync(htmlPath, 'utf8');
  } catch (err) {
    res.status(500).setHeader('Content-Type', 'text/plain').send('Finance page file not found: ' + htmlPath);
    return;
  }
  res.status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    .send(html);
}

export default async function handler(req, res) {
  const level = (req.query && req.query.level) || 'admin';
  if (level !== 'admin' && level !== 'investor') {
    res.status(400).send('Invalid level');
    return;
  }

  const cookies = parseCookies(req);
  const session = verify(cookies[COOKIE_NAME]);

  if (req.method === 'GET') {
    if (hasAccess(session, level)) {
      serveHtml(res, level);
      return;
    }
    res.status(200)
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', 'no-store')
      .send(loginPageHtml(level));
    return;
  }

  if (req.method === 'POST') {
    const submitted = getFormValue(req, 'password') || '';
    const envKey = level === 'admin' ? 'FINANCE_ADMIN_PASSWORD' : 'FINANCE_INVESTOR_PASSWORD';
    const expected = process.env[envKey] || '';
    if (!expected) {
      res.status(500).send('Gate not configured: ' + envKey + ' missing');
      return;
    }
    // constant-time compare
    let ok = false;
    try {
      const a = Buffer.from(submitted);
      const b = Buffer.from(expected);
      ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { ok = false; }

    if (!ok) {
      res.status(401)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .setHeader('Cache-Control', 'no-store')
        .send(loginPageHtml(level, 'Incorrect password.'));
      return;
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const token = sign(`${level}.${issuedAt}`);
    const cookie = [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${COOKIE_MAX_AGE}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
    ].join('; ');

    res.setHeader('Set-Cookie', cookie);
    res.status(302).setHeader('Location', `/finance/${level}`).end();
    return;
  }

  res.status(405).send('Method not allowed');
}
