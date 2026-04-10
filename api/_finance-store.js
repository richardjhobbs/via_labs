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

import { put, get } from '@vercel/blob';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEY_STAGED    = 'finance/staged.json';
const KEY_PUBLISHED = 'finance/published.json';
const KEY_HISTORY   = 'finance/history.json';

// Finance data is sensitive: store everything under a private blob.
// Private blobs require authenticated reads via the SDK's `get()`.
const BLOB_ACCESS = 'private';

function ensureBlobConfigured() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const err = new Error('Blob storage not configured: BLOB_READ_WRITE_TOKEN missing. Create a Blob store in the Vercel dashboard and connect it to this project.');
    err.code = 'BLOB_NOT_CONFIGURED';
    throw err;
  }
}

// Read a private blob by pathname, parse JSON. Returns null if not found.
async function fetchBlobJson(pathname) {
  ensureBlobConfigured();
  let result;
  try {
    result = await get(pathname, { access: BLOB_ACCESS, useCache: false });
  } catch (err) {
    // SDK throws BlobNotFoundError when the key doesn't exist yet.
    if (err && (err.name === 'BlobNotFoundError' || err.code === 'not_found' || String(err.message || '').includes('not found'))) {
      return null;
    }
    throw err;
  }
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  // Consume the stream → text → JSON.
  const reader = result.stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const text = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf8');
  try { return JSON.parse(text); } catch { return null; }
}

async function writeBlobJson(pathname, data) {
  ensureBlobConfigured();
  const body = JSON.stringify(data);
  await put(pathname, body, {
    access: BLOB_ACCESS,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  return { key: pathname, size: body.length };
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
