// ─────────────────────────────────────────────────────────
// Blob-storage helpers for the finance data.
// All state lives under the `finance/` prefix in a Vercel Blob store.
//
// Three logical documents:
//   finance/staged.json     — admin's saved-but-not-published working copy
//   finance/published.json  — live investor version
//   finance/history.json    — append-only log of publishes
//
// Falls back to the bundled repo `finance/data.json` seed when a blob
// doesn't exist yet (first deploy, or before anything has been saved).
// ─────────────────────────────────────────────────────────

import { put, head, list } from '@vercel/blob';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY_STAGED    = 'finance/staged.json';
const KEY_PUBLISHED = 'finance/published.json';
const KEY_HISTORY   = 'finance/history.json';

function ensureBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const err = new Error('Blob storage not configured: BLOB_READ_WRITE_TOKEN missing. Create a Blob store in the Vercel dashboard and connect it to this project.');
    err.code = 'BLOB_NOT_CONFIGURED';
    throw err;
  }
}

// Fetch a blob by its logical key. Returns parsed JSON or null if missing.
// Uses `list` + `head`-style URL lookup so we can bypass random suffixes.
async function fetchBlobJson(key) {
  ensureBlobConfigured();
  // `head(url)` requires a URL, not a pathname, so first resolve via list.
  const { blobs } = await list({ prefix: key, limit: 1 });
  const match = blobs.find(b => b.pathname === key);
  if (!match) return null;
  const res = await fetch(match.url, { cache: 'no-store' });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

async function writeBlobJson(key, data) {
  ensureBlobConfigured();
  const body = JSON.stringify(data);
  await put(key, body, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return { key, size: body.length };
}

// Bundled repo seed — used when blob storage has no staged or published yet.
export function loadBundledSeed() {
  const path = join(__dirname, '..', 'finance', 'data.json');
  return JSON.parse(readFileSync(path, 'utf8'));
}

export async function getStaged() {
  try { return await fetchBlobJson(KEY_STAGED); }
  catch (err) { if (err.code === 'BLOB_NOT_CONFIGURED') throw err; return null; }
}

export async function getPublished() {
  try { return await fetchBlobJson(KEY_PUBLISHED); }
  catch (err) { if (err.code === 'BLOB_NOT_CONFIGURED') throw err; return null; }
}

export async function getHistory() {
  try {
    const h = await fetchBlobJson(KEY_HISTORY);
    return Array.isArray(h) ? h : [];
  } catch (err) {
    if (err.code === 'BLOB_NOT_CONFIGURED') throw err;
    return [];
  }
}

export async function putStaged(data) {
  return writeBlobJson(KEY_STAGED, data);
}

export async function putPublished(data) {
  return writeBlobJson(KEY_PUBLISHED, data);
}

export async function appendHistory(entry) {
  const current = await getHistory();
  const next = [entry, ...current].slice(0, 200); // cap at 200 entries
  await writeBlobJson(KEY_HISTORY, next);
  return next;
}
