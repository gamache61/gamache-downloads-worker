var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
import { DurableObject } from "cloudflare:workers";
var GITHUB_OWNER = "gamache61";
var GITHUB_REPO = "MyAppDownloads";
var DAYS_ALLOWED = 30;
var MAX_DEVICES = 2;
var SUPPORT_EMAIL = "gamacheapps@gmail.com";
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sid = url.searchParams.get("session_id") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (url.pathname === "/activate" && request.method === "POST") {
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
      }
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
        html += `<div class="keybox"><p class="small">${esc(a.name)} \u2014 your unlock key:</p>
          <p class="key">${esc(key)}</p>
          ${a.url ? `<a class="btn" href="${esc(a.url)}" target="_blank" rel="noopener">Open ${esc(a.name)}</a>` : ""}
          <ol class="steps">
            <li>Click <b>Open ${esc(a.name)}</b>.</li>
            <li>Install it:<br>
              <b>Chrome (computer):</b> \u22EE menu \u2192 <b>Cast, save and share</b> \u2192 <b>Install page as app</b><br>
              <b>Edge (computer):</b> \u22EF menu \u2192 <b>Apps</b> \u2192 <b>Install this site as an app</b><br>
              <b>Phone:</b> browser menu \u2192 <b>Add to Home Screen</b> (iPhone: Share button \u2192 Add to Home Screen)</li>
            <li>Open the installed app, type your key in the box that appears, and click <b>Unlock</b>.</li>
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
      const names = Array.isArray(list) ? list.map((x) => `${x.name} (${(x.size / 1048576).toFixed(2)} MB)`) : [];
      return page("Setup check", `<p>Files the download program can see:</p><p class="small">${names.map(esc).join("<br>") || "(none)"}</p>
        <p class="small">Unlock keys: ${env.LICENSES ? "ready \u2705" : "not set up \u274C"}</p>`);
    }
    return page("Gamache Apps", `<p>Nothing here.</p>`, 404);
  }
};
var Licenses = class extends DurableObject {
  static {
    __name(this, "Licenses");
  }
  async keyFor(sid, app) {
    const existing = await this.ctx.storage.get(`s:${sid}:${app}`);
    if (existing) return existing;
    let key;
    do {
      key = `${app}-${rand4()}-${rand4()}`;
    } while (await this.ctx.storage.get(`k:${key}`));
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
};
function store(env) {
  return env.LICENSES.get(env.LICENSES.idFromName("all"));
}
__name(store, "store");
function rand4() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b, (x) => chars[x % chars.length]).join("");
}
__name(rand4, "rand4");
function stripeKeyFor(sid, env) {
  // cs_test_ -> Sandbox/Test key, cs_live_ -> Live key, pi_ -> try Test first then Live in stripeGet
  if (typeof sid === "string" && sid.startsWith("cs_test_")) return (env.STRIPE_TEST_SECRET_KEY || "").trim();
  if (typeof sid === "string" && sid.startsWith("cs_live_")) return (env.STRIPE_SECRET_KEY || "").trim();
  return (env.STRIPE_SECRET_KEY || "").trim();
}
__name(stripeKeyFor, "stripeKeyFor");
async function stripeGet(path, env, sid) {
  // Try the key that matches the sid first, then the other one as fallback (for pi_ lookups)
  const first = stripeKeyFor(sid, env);
  const second = first === (env.STRIPE_TEST_SECRET_KEY || "").trim() ? (env.STRIPE_SECRET_KEY || "").trim() : (env.STRIPE_TEST_SECRET_KEY || "").trim();
  let res = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${first}` } });
  if (res.ok) return await res.json();
  if (second && second !== first) {
    const res2 = await fetch(`https://api.stripe.com${path}`, { headers: { Authorization: `Bearer ${second}` } });
    if (res2.ok) return await res2.json();
    return await res.json().catch(() => ({}));
  }
  return await res.json().catch(() => ({}));
}
__name(stripeGet, "stripeGet");
async function checkPurchase(sid, env) {
  if (/^pi_[A-Za-z0-9]+$/.test(sid)) {
    const list = await stripeGet("/v1/checkout/sessions?limit=1&payment_intent=" + sid, env, sid);
    const found = list?.data?.[0];
    if (!found?.id) return { ok: false, error: "No Checkout Session found for that Payment" };
    sid = found.id;
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { ok: false, error: "session ID is not valid" };
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price.product`,
    { headers: { Authorization: `Bearer ${stripeKeyFor(sid, env)}` } }
  );
  if (!res.ok) return { error: "We couldn't find this purchase." };
  const s = await res.json();
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required")
    return { error: "This payment hasn't been completed." };
  if ((Date.now() / 1e3 - s.created) / 86400 > DAYS_ALLOWED) return { error: "This link has expired. Email us with your receipt." };
  const files = [], apps = [];
  for (const item of s.line_items && s.line_items.data || []) {
    const prod = item.price && item.price.product || {};
    const meta = typeof prod === "object" && prod.metadata || {};
    const code = String(meta.app || meta.App || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (code) {
      if (!apps.some((a) => a.code === code))
        apps.push({ code, name: prod.name || item.description || "Your app", url: String(meta.app_url || "").trim() });
      continue;
    }
    (meta.file || meta.File || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => files.includes(x) || files.push(x));
  }
  if (!files.length && !apps.length) return { error: "No app is attached to this product." };
  return { files, apps };
}
__name(checkPurchase, "checkPurchase");
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
__name(gh, "gh");
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
__name(getFile, "getFile");
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(cors, "cors");
function json(obj) {
  return new Response(JSON.stringify(obj), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors() } });
}
__name(json, "json");
function help() {
  return `<p class="small">Need help? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`;
}
__name(help, "help");
function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(esc, "esc");
function page(title, body, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8">
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
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}
__name(page, "page");
export {
  Licenses,
  worker_default as default
};
//# sourceMappingURL=worker.js.map
