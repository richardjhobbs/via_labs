// ─────────────────────────────────────────────────────────
// GET /api/finance-history
//   Auth: admin cookie required.
//
// Returns the publish history as an array of { at, size, note } entries,
// newest first. Used by the admin UI to show a timestamped audit trail
// of investor-facing pushes.
// ─────────────────────────────────────────────────────────

import { requireAdmin } from './_finance-auth.js';
import { getHistory } from './_finance-store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const history = await getHistory();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ entries: history });
  } catch (e) {
    if (e.code === 'BLOB_NOT_CONFIGURED') {
      res.status(503).json({ error: e.message, entries: [] });
      return;
    }
    console.error('finance-history failed', e);
    res.status(500).json({ error: 'history failed: ' + (e.message || 'unknown') });
  }
}
