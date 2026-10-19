import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const env = process.env;
const TOKEN = env.REPLICATE_API_TOKEN;
const PASSWORD = env.APP_PASSWORD; // optional: protects your credits on a public site
const PORT = env.PORT || 3000;

// Models are configurable, because model names and input fields change over time.
// Check the "API" tab of each model on replicate.com if something stops working.
const IMAGE_MODEL = env.IMAGE_MODEL || "black-forest-labs/flux-schnell";
const IMAGE_EXTRA = JSON.parse(env.IMAGE_EXTRA_INPUT || '{"aspect_ratio":"16:9","output_format":"jpg"}');
const VIDEO_MODEL = env.VIDEO_MODEL || "bytedance/seedance-1-lite";
const VIDEO_IMAGE_FIELD = env.VIDEO_IMAGE_FIELD || "image";
const VIDEO_EXTRA = JSON.parse(env.VIDEO_EXTRA_INPUT || '{"duration":5,"resolution":"720p"}');

const API = "https://api.replicate.com/v1";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAX_BYTES = 15 * 1024 * 1024;
const DEFAULT_MOTION_PROMPT = "Natural, gentle motion of the subject and camera";

const send = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

const fail = (status, message) => Object.assign(new Error(message), { status });

const readJson = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(fail(413, "इमेज बहुत बड़ी है"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      } catch {
        reject(fail(400, "गलत डेटा"));
      }
    });
    req.on("error", reject);
  });

async function replicate(url, options = {}) {
  const r = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw fail(r.status, data.detail || data.title || "Replicate से जवाब नहीं मिला");
  return data;
}

const createPrediction = async (model, input) =>
  (await replicate(`${API}/models/${model}/predictions`, {
    method: "POST",
    body: JSON.stringify({ input }),
  })).id;

// Only allow images that the app itself got from Replicate (prevents abuse of arbitrary URLs).
const isReplicateUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.endsWith("replicate.delivery");
  } catch {
    return false;
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(await fs.readFile(path.join(HERE, "public", "index.html")));
    }

    if (url.pathname.startsWith("/api/")) {
      if (!TOKEN) throw fail(500, "REPLICATE_API_TOKEN सेट नहीं है। README देखें।");
      if (PASSWORD && req.headers["x-app-password"] !== PASSWORD) throw fail(401, "पासवर्ड गलत है");
    }

    // 1) Text -> image
    if (req.method === "POST" && url.pathname === "/api/text-to-image") {
      const { prompt } = await readJson(req);
      if (!prompt || !prompt.trim()) throw fail(400, "प्रॉम्प्ट खाली है");
      const id = await createPrediction(IMAGE_MODEL, { prompt: prompt.trim().slice(0, 1000), ...IMAGE_EXTRA });
      return send(res, 200, { id });
    }

    // 2) and 3) Image -> video (prompt optional)
    if (req.method === "POST" && url.pathname === "/api/image-to-video") {
      const { image, imageUrl, prompt } = await readJson(req);
      const source = image?.startsWith("data:image/") ? image : isReplicateUrl(imageUrl) ? imageUrl : null;
      if (!source) throw fail(400, "फ़ोटो नहीं मिली");
      const id = await createPrediction(VIDEO_MODEL, {
        prompt: (prompt || "").trim().slice(0, 1000) || DEFAULT_MOTION_PROMPT,
        [VIDEO_IMAGE_FIELD]: source,
        ...VIDEO_EXTRA,
      });
      return send(res, 200, { id });
    }

    // Polling
    if (req.method === "GET" && url.pathname.startsWith("/api/status/")) {
      const id = url.pathname.split("/").pop();
      if (!/^[a-z0-9]+$/i.test(id)) throw fail(400, "गलत id");
      const p = await replicate(`${API}/predictions/${id}`);
      const output = Array.isArray(p.output) ? p.output[0] : p.output;
      return send(res, 200, {
        status: p.status,
        url: typeof output === "string" ? output : null,
        error: p.error || null,
      });
    }

    send(res, 404, { error: "Not found" });
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
});

server.listen(PORT, () => console.log(`चालू है: http://localhost:${PORT}`));
