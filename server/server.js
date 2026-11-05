// Closet Swap server: serves the frontend from /public, photos from /uploads,
// and a small JSON API backed by SQLite. No npm packages required (Node 22.5+).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.js";
import { openDb, COLLECTIONS } from "./db.js";
import { labelImage, AiError } from "./ai.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv(ROOT);

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const db = openDb(process.env.DB_FILE || path.join(ROOT, "data", "closet.db"));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_JSON = 256 * 1024;          // regular saves
const MAX_IMAGE_JSON = 12 * 1024 * 1024; // uploads and AI labeling (base64 photo)
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

// ---------- helpers
function send(res, status, body, headers = {}) {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": typeof body === "object" && !Buffer.isBuffer(body) ? "application/json" : "text/plain; charset=utf-8", ...headers });
  res.end(data);
}
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, "That’s too large to save.")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch { reject(new HttpError(400, "The request wasn’t valid JSON.")); }
    });
    req.on("error", reject);
  });
}

function parseDataUrl(dataUrl) {
  const m = typeof dataUrl === "string" && dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new HttpError(400, "Send the photo as a JPG, PNG or WebP.");
  return { mediaType: m[1], base64: m[2] };
}

function serveFile(res, baseDir, urlPath) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, "") || "index.html";
  const file = path.resolve(baseDir, rel);
  if (!file.startsWith(baseDir + path.sep) && file !== baseDir) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, "Not found");
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": baseDir === UPLOAD_DIR ? "public, max-age=31536000, immutable" : "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

// ---------- API
async function api(req, res, url) {
  const parts = url.pathname.split("/").filter(Boolean).slice(1); // drop "api"

  if (req.method === "GET" && parts[0] === "health") {
    return send(res, 200, { ok: true, ai: Boolean(process.env.ANTHROPIC_API_KEY) });
  }

  if (req.method === "GET" && parts[0] === "state") {
    return send(res, 200, db.state());
  }

  if (req.method === "POST" && parts[0] === "upload") {
    const { dataUrl } = await readJson(req, MAX_IMAGE_JSON);
    const { mediaType, base64 } = parseDataUrl(dataUrl);
    const name = `${crypto.randomUUID()}.${IMAGE_TYPES[mediaType]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(base64, "base64"));
    return send(res, 201, { url: `/uploads/${name}` });
  }

  if (req.method === "POST" && parts[0] === "label") {
    const { image } = await readJson(req, MAX_IMAGE_JSON);
    const result = await labelImage(parseDataUrl(image));
    return send(res, 200, result);
  }

  // PUT /api/:collection/:id   and   DELETE /api/:collection/:id
  if (parts.length === 2 && COLLECTIONS.includes(parts[0])) {
    const [collection, id] = parts;
    if (!ID_RE.test(id)) throw new HttpError(400, "That id isn’t valid.");
    if (req.method === "PUT") {
      const data = await readJson(req, MAX_JSON);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Send an object to save.");
      delete data.id;
      db.put(collection, id, data);
      return send(res, 200, { ok: true });
    }
    if (req.method === "DELETE") {
      db.remove(collection, id);
      return send(res, 200, { ok: true });
    }
  }

  throw new HttpError(404, "That API route doesn’t exist.");
}

// ---------- server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (url.pathname.startsWith("/uploads/")) return serveFile(res, UPLOAD_DIR, url.pathname.slice("/uploads/".length));
    if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
    return serveFile(res, PUBLIC_DIR, url.pathname);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500 && !(err instanceof AiError)) console.error(err);
    return send(res, status, { error: err.message || "Something went wrong.", code: err.code });
  }
});

server.listen(PORT, () => {
  console.log(`Closet Swap is running at http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.log("AI auto-fill is off. Add ANTHROPIC_API_KEY to .env to turn it on.");
});
