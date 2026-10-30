// Gamache Apps — Stripe delivery + unlock keys (Cloudflare Worker)
// Needs secrets: STRIPE_SECRET_KEY and GITHUB_TOKEN.
//
// Stripe product metadata (pick one per product):
//   Unlock-key apps:  app = AXLE            (short code, letters only)
//                     app_url = https://gamache61.github.io/MyAxelWeightsApp/
//   File downloads:   file = ExactFileName.zip   (comma-separate for several files)

import { DurableObject } from "cloudflare:workers";

const GITHUB_OWNER = "gamache61";
const GITHUB_REPO = "MyAppDownloads";
const DAYS_ALLOWED = 30;          // how long the thank-you / download page works after purchase
const MAX_DEVICES = 2;            // installs allowed per key
const SUPPORT_EMAIL = "gamacheapps@gmail.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sid = url.searchParams.get("session_id") || "";

    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });

    // App asks to unlock with a key.
    if (url.pathname === "/activate" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const key = String(body.key || "").trim().toUpperCase().replace(/\s+/g, "");
      const app = String(body.app || "").trim().toUpperCase();
      const device = String(body.device || "").slice(0, 80);
      if (!key || !app || !device) return json({ ok: false, error: "Missing key." });
      const r = await store(env).activate(key, app, device, MAX_DEVICES);
      if (r.error === "notfound") return json({ ok: false, error: "That key isn't valid. Check it and try again." });
      if (r.error === "wrongapp") return json({ ok: false, error: "That key is for a different app." });
      if (r.error === "full") return json({ ok: false, error: `This key is already used on ${MAX_DEVICES} devices. Email ${SUPPORT_EMAIL} for help.` });
      return json({ ok: true });
    }

    // Owner tool: free up a key's devices.  /reset?key=AXLE-XXXX-XXXX&pass=YOUR_ADMIN_PASS
    // (Only works after you add a secret named ADMIN_PASS in Cloudflare.)
    if (url.pathname === "/reset") {
      const pass = url.searchParams.get("pass") || "";
      const admin = (env.ADMIN_PASS || "").trim();
      if (!admin || pass !== admin) return page("Reset", `<p>Not allowed.</p>`, 403);
      const key = (url.searchParams.get("key") || "").trim().toUpperCase();
      const ok = await store(env).reset(key);
      return page("Reset", `<p>${ok ? `Key ${esc(key)} reset. It can be used on ${MAX_DEVICES} new devices.` : "Key not found."}</p>`);
    }

    if (url.pathname === "/download") {
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p>${help()}`, 403);

      let html = "";
      for (const a of result.apps) {
        const key = await store(env).keyFor(sid, a.code);
        html += `<div class="keybox"><p class="small">${esc(a.name)} — your unlock key:</p>
          <p class="key">${esc(key)}</p>
          ${a.url ? `<a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">Open ${esc(a.name)}</a>` : ""}
          <ol class="steps">
            <li>Click <b>Open ${esc(a.name)}</b>.</li>
            <li>Install it: click the <b>install icon</b> at the right end of the address bar (Chrome or Edge). On a phone, use <b>Add to Home Screen</b>.</li>
            <li>In the app, click <b>🔑 Unlock</b> and enter your key.</li>
          </ol>
          <p class="small">Works on up to ${MAX_DEVICES} devices. Write your key down or save this page.</p></div>`;
      }
      for (const f of result.files) {
        html += `<a class="btn" href="/file?session_id=${encodeURIComponent(sid)}&f=${encodeURIComponent(f)}">Download ${esc(f)}</a>`;
      }
      return page("Thank you for your purchase!", html + help());
    }

    if (url.pathname === "/file") {
      const f = url.searchParams.get("f") || "";
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p>${help()}`, 403);
      if (!result.files.includes(f)) return page("Download problem", `<p>That file is not part of this purchase.</p>${help()}`, 403);
      const got = await getFile(f, env);
      if (got.error) return page("Download problem", `<p>The file could not be found.</p><p class="small">${esc(got.error)}</p>${help()}`, 404);
      return new Response(got.body, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${f.replace(/"/g, "")}"`,
          "Cache-Control": "no-store"
        }
      });
    }

    if (url.pathname === "/check") {
      const r = await gh(`contents/`, env, "application/vnd.github+json");
      if (!r.ok) return page("Setup check", `<p>GitHub refused (error ${r.status}). The GITHUB_TOKEN may be wrong or expired.</p>`);
      const list = await r.json();
      const names = Array.isArray(list) ? list.map(x => `${x.name} (${(x.size / 1048576).toFixed(2)} MB)`) : [];
      return page("Setup check", `<p>Files the download program can see:</p><p class="small">${names.map(esc).join("<br>") || "(none)"}</p>
        <p class="small">Unlock keys: ${env.LICENSES ? "ready ✅" : "not set up ❌"}</p>`);
    }

    return page("Gamache Apps", `<p>Nothing here.</p>`, 404);
  }
};

// ---------- Key storage (one Durable Object holds every key) ----------

export class Licenses extends DurableObject {
  async keyFor(sid, app) {
    const existing = await this.ctx.storage.get(`s:${sid}:${app}`);
    if (existing) return existing;
    let key;
    do { key = `${app}-${rand4()}-${rand4()}`; } while (await this.ctx.storage.get(`k:${key}`));
    await this.ctx.storage.put(`k:${key}`, { app, sid, devices: [], created: Date.now() });
    await this.ctx.storage.put(`s:${sid}:${app}`, key);
    return key;
  }

  async activate(key, app, device, max) {
    const rec = await this.ctx.storage.get(`k:${key}`);
    if (!rec) return { error: "notfound" };
    if (rec.app !== app) return { error: "wrongapp" };
    if (rec.devices.includes(device)) return { ok: true };
    if (rec.devices.length >= max) return { error: "full" };
    rec.devices.push(device);
    await this.ctx.storage.put(`k:${key}`, rec);
    return { ok: true };
  }

  async reset(key) {
    const rec = await this.ctx.storage.get(`k:${key}`);
    if (!rec) return false;
    rec.devices = [];
    await this.ctx.storage.put(`k:${key}`, rec);
    return true;
  }
}

function store(env) {
  return env.LICENSES.get(env.LICENSES.idFromName("all"));
}

function rand4() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b, x => chars[x % chars.length]).join("");
}

// ---------- Stripe ----------

async function checkPurchase(sid, env) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { error: "This link is not valid." };
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price.product`,
    { headers: { Authorization: `Bearer ${(env.STRIPE_SECRET_KEY || "").trim()}` } }
  );
  if (!res.ok) return { error: "We couldn't find this purchase." };
  const s = await res.json();
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required")
    return { error: "This payment hasn't been completed." };
  if ((Date.now() / 1000 - s.created) / 86400 > DAYS_ALLOWED) return { error: "This link has expired. Email us with your receipt." };

  const files = [], apps = [];
  for (const item of (s.line_items && s.line_items.data) || []) {
    const prod = (item.price && item.price.product) || {};
    const meta = (typeof prod === "object" && prod.metadata) || {};
    const code = String(meta.app || meta.App || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (code) {
      if (!apps.some(a => a.code === code))
        apps.push({ code, name: prod.name || item.description || "Your app", url: String(meta.app_url || "").trim() });
      continue;
    }
    (meta.file || meta.File || "").split(",").map(x => x.trim()).filter(Boolean)
      .forEach(x => files.includes(x) || files.push(x));
  }
  if (!files.length && !apps.length) return { error: "No app is attached to this product." };
  return { files, apps };
}

// ---------- GitHub (file downloads) ----------

function gh(path, env, accept) {
  return fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`, {
    headers: {
      Authorization: `Bearer ${(env.GITHUB_TOKEN || "").trim()}`,
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gamache-downloads"
    }
  });
}

async function getFile(f, env) {
  const path = "contents/" + f.split("/").map(encodeURIComponent).join("/");
  const info = await gh(path, env, "application/vnd.github+json");
  if (!info.ok) return { error: `GitHub said ${info.status} for "${f}".` };
  const meta = await info.json();
  if (!meta || !meta.sha) return { error: `"${f}" is not a file.` };
  const blob = await gh(`git/blobs/${meta.sha}`, env, "application/vnd.github.raw");
  if (blob.ok) return { body: blob.body };
  if (meta.download_url) {
    const d = await fetch(meta.download_url, { headers: { "User-Agent": "gamache-downloads" } });
    if (d.ok) return { body: d.body };
    return { error: `GitHub said ${blob.status}/${d.status} for "${f}".` };
  }
  return { error: `GitHub said ${blob.status} for "${f}".` };
}

// ---------- Helpers ----------

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors() } });
}

function help() {
  return `<p class="small">Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
}

function esc(t) {
  return String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function page(title, body, status = 200) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>
body{margin:0;font-family:system-ui,sans-serif;background:#0f1720;color:#e8eef5;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px}
.card{background:#1a2532;border-radius:14px;padding:28px;max-width:480px;width:100%;text-align:center;box-shadow:0 8px 30px #0006}
h1{font-size:1.4rem;margin:0 0 12px}
.btn{display:block;margin:12px 0;padding:14px;background:#2f8cff;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;word-break:break-word}
.btn:hover{background:#1f74e0}
.keybox{background:#0f1720;border-radius:12px;padding:16px;margin:14px 0}
.key{font-family:ui-monospace,Consolas,monospace;font-size:1.6rem;letter-spacing:2px;margin:6px 0 10px;user-select:all;color:#ffd166}
.steps{text-align:left;margin:10px 0 0;padding-left:22px;line-height:1.6}
.small{font-size:.85rem;opacity:.75;margin-top:14px}
a{color:#7fb8ff}
</style></head><body><div class="card"><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
