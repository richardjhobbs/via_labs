// ─────────────────────────────────────────────────────────
// Shared auth helpers for the finance endpoints.
// Underscore prefix keeps Vercel from treating this as a route.
// ─────────────────────────────────────────────────────────

import crypto from 'crypto';

export const COOKIE_NAME = 'finance_session';
const COOKIE_MAX_AGE = 60 * 60 * 12;

function getSecret() {
  const s = process.env.FINANCE_COOKIE_SECRET;
  if (!s || s.length < 16) throw new Error('FINANCE_COOKIE_SECRET not set');
  return s;
}

export function verifySession(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [level, issuedAt, sig] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${level}.${issuedAt}`).digest('base64url');
  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); } catch {}
  if (!ok) return null;
  const age = Date.now() / 1000 - Number(issuedAt);
  if (age > COOKIE_MAX_AGE || age < 0) return null;
  if (level !== 'admin' && level !== 'investor') return null;
  return { level };
}

export function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      out[k] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

export function getSession(req) {
  return verifySession(parseCookies(req)[COOKIE_NAME]);
}

export function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session || session.level !== 'admin') {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return session;
}
