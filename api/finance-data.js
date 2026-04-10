// ─────────────────────────────────────────────────────────
// /api/finance-data — gated JSON endpoint for canonical finance data.
//
// Query:
//   ?level=admin    → full data.json (includes quarterly OpEx)
//   ?level=investor → stripped payload (annual subtotals only, no quarterly detail)
//
// Auth: must present a valid finance_session cookie.
// Admin endpoint requires level=admin in the cookie; investor accepts any.
// ─────────────────────────────────────────────────────────

import crypto from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COOKIE_NAME = 'finance_session';
const COOKIE_MAX_AGE = 60 * 60 * 12;

function getSecret() {
  const s = process.env.FINANCE_COOKIE_SECRET;
  if (!s || s.length < 16) throw new Error('FINANCE_COOKIE_SECRET not set');
  return s;
}

function verify(token) {
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

function parseCookies(req) {
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

function hasAccess(session, required) {
  if (!session) return false;
  if (required === 'investor') return true;
  if (required === 'admin' && session.level === 'admin') return true;
  return false;
}

// Build a stripped-down version of the data payload for investor view.
// - Removes quarterly OpEx granularity, replaces each category with an annual subtotal array [y1..y5]
// - Keeps assumptions (for engine to recalc) but investor page doesn't expose inputs
function stripForInvestor(data) {
  const stripOpex = (opex) => {
    const out = {};
    for (const cat in opex) {
      const annuals = [0, 0, 0, 0, 0];
      for (const lineItem in opex[cat]) {
        const arr = opex[cat][lineItem] || [];
        for (let y = 0; y < 5; y++) {
          for (let q = 0; q < 4; q++) {
            annuals[y] += Number(arr[y * 4 + q]) || 0;
          }
        }
      }
      out[cat] = annuals;
    }
    return out;
  };

  const via = { ...data.via, opex: undefined, opexAnnual: stripOpex(data.via.opex) };
  const rrg = { ...data.rrg, opex: undefined, opexAnnual: stripOpex(data.rrg.opex) };
  delete via.opex;
  delete rrg.opex;
  return { seedRaise: data.seedRaise, years: data.years, via, rrg };
}

function loadData() {
  const path = join(__dirname, '..', 'finance', 'data.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export default async function handler(req, res) {
  const level = (req.query && req.query.level) || 'investor';
  if (level !== 'admin' && level !== 'investor') {
    res.status(400).json({ error: 'invalid level' });
    return;
  }

  const session = verify(parseCookies(req)[COOKIE_NAME]);
  if (!hasAccess(session, level)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const data = loadData();
  const payload = level === 'admin' ? data : stripForInvestor(data);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.status(200).json(payload);
}
