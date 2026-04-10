// ─────────────────────────────────────────────────────────
// GET /api/finance-data
//
// Query params:
//   ?level=admin         → full data payload (includes quarterly OpEx)
//   ?level=investor      → stripped payload (annual OpEx subtotals only)
//
//   ?variant=staged      → (admin only) return the staged blob
//   ?variant=published   → (admin only) return the published blob
//   default for admin    → staged if present, else published, else bundled seed
//
//   ?preview=staged      → (investor+admin cookie) return staged instead of
//                          published so the admin can preview their next
//                          release without publishing it
//
// Auth:
//   admin level           → requires admin session
//   investor level        → any valid finance session
//   investor + preview    → requires admin session (can't leak staged to investors)
// ─────────────────────────────────────────────────────────

import { getSession } from './_finance-auth.js';
import {
  getStaged, getPublished, loadBundledSeed,
} from './_finance-store.js';

// Annualise quarterly opex for the investor payload.
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

// Resolve which blob variant to serve, with fallbacks.
// Returns { data, source } where source is 'staged' | 'published' | 'seed'.
async function resolveData(variant) {
  if (variant === 'staged') {
    const s = await getStaged();
    if (s) return { data: s, source: 'staged' };
    const p = await getPublished();
    if (p) return { data: p, source: 'published' };
    return { data: loadBundledSeed(), source: 'seed' };
  }
  if (variant === 'published') {
    const p = await getPublished();
    if (p) return { data: p, source: 'published' };
    return { data: loadBundledSeed(), source: 'seed' };
  }
  // default
  const p = await getPublished();
  if (p) return { data: p, source: 'published' };
  return { data: loadBundledSeed(), source: 'seed' };
}

export default async function handler(req, res) {
  const level = (req.query && req.query.level) || 'investor';
  const variant = (req.query && req.query.variant) || null;
  const preview = (req.query && req.query.preview) || null;

  if (level !== 'admin' && level !== 'investor') {
    res.status(400).json({ error: 'invalid level' });
    return;
  }

  const session = getSession(req);

  // Admin-level requests must have an admin session.
  if (level === 'admin') {
    if (!session || session.level !== 'admin') {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  } else {
    // Investor level: any valid session is fine for published data.
    if (!session) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    // But if preview=staged is requested, the caller must be admin.
    if (preview === 'staged' && session.level !== 'admin') {
      res.status(403).json({ error: 'preview requires admin session' });
      return;
    }
  }

  // Decide which variant to resolve:
  //  - admin + explicit variant → that variant
  //  - admin default            → staged (fallback chain handles it)
  //  - investor + preview       → staged
  //  - investor default         → published
  let resolveVariant;
  if (level === 'admin') {
    resolveVariant = variant || 'staged';
  } else {
    resolveVariant = preview === 'staged' ? 'staged' : 'published';
  }

  try {
    const { data, source } = await resolveData(resolveVariant);
    const payload = level === 'admin' ? data : stripForInvestor(data);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('X-Finance-Source', source);
    res.status(200).json(payload);
  } catch (e) {
    if (e.code === 'BLOB_NOT_CONFIGURED') {
      // Before Blob is enabled, serve the bundled seed directly so the page
      // still works in a degraded read-only state.
      try {
        const seed = loadBundledSeed();
        const payload = level === 'admin' ? seed : stripForInvestor(seed);
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Finance-Source', 'seed');
        res.setHeader('X-Finance-Degraded', 'blob-not-configured');
        res.status(200).json(payload);
        return;
      } catch {}
    }
    console.error('finance-data failed', e);
    res.status(500).json({ error: 'data failed: ' + (e.message || 'unknown') });
  }
}
