// ─────────────────────────────────────────────────────────
// POST /api/finance-save
//   Body: { inputs: <full finance inputs object> }
//   Auth: admin cookie required.
//
// Writes the posted inputs to the staged blob. Does NOT touch the
// published blob — that only changes on /api/finance-publish.
// ─────────────────────────────────────────────────────────

import { requireAdmin } from './_finance-auth.js';
import { putStaged } from './_finance-store.js';

function validateShape(data) {
  if (!data || typeof data !== 'object') return 'body must be an object';
  if (!Array.isArray(data.years) || data.years.length !== 5) return 'years must be length-5 array';
  if (typeof data.seedRaise !== 'number') return 'seedRaise must be a number';
  if (!data.via || typeof data.via !== 'object') return 'via missing';
  if (!data.rrg || typeof data.rrg !== 'object') return 'rrg missing';
  if (!data.via.opex || typeof data.via.opex !== 'object') return 'via.opex missing';
  if (!data.rrg.opex || typeof data.rrg.opex !== 'object') return 'rrg.opex missing';
  return null;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  // fallback: raw stream
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  const body = await readBody(req);
  const inputs = body && body.inputs ? body.inputs : body;
  const err = validateShape(inputs);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }

  try {
    const result = await putStaged(inputs);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      ok: true,
      at: new Date().toISOString(),
      size: result.size,
    });
  } catch (e) {
    if (e.code === 'BLOB_NOT_CONFIGURED') {
      res.status(503).json({ error: e.message });
      return;
    }
    console.error('finance-save failed', e);
    res.status(500).json({ error: 'save failed: ' + (e.message || 'unknown') });
  }
}
