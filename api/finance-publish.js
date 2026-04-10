// ─────────────────────────────────────────────────────────
// POST /api/finance-publish
//   Body: { note?: string }
//   Auth: admin cookie required.
//
// Reads the current staged blob and writes it to the published blob,
// then appends a history entry with a timestamp and optional release note.
// Investors see the published blob on their next load.
// ─────────────────────────────────────────────────────────

import { requireAdmin } from './_finance-auth.js';
import {
  getStaged, putPublished, appendHistory, getHistory,
} from './_finance-store.js';

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const body = await readBody(req);
  const note = (body && typeof body.note === 'string') ? body.note.trim().slice(0, 280) : '';

  try {
    const staged = await getStaged();
    if (!staged) {
      res.status(409).json({ error: 'nothing to publish: no staged version. Save first.' });
      return;
    }

    const result = await putPublished(staged);
    const at = new Date().toISOString();
    const entry = { at, size: result.size, note: note || null };
    const history = await appendHistory(entry);

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      ok: true,
      at,
      note: entry.note,
      size: result.size,
      history: history.slice(0, 10),
    });
  } catch (e) {
    if (e.code === 'BLOB_NOT_CONFIGURED') {
      res.status(503).json({ error: e.message });
      return;
    }
    console.error('finance-publish failed', e);
    res.status(500).json({ error: 'publish failed: ' + (e.message || 'unknown') });
  }
}
