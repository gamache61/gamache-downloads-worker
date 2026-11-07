import { DurableObject } from "cloudflare:workers";

const GITHUB_OWNER = "gamache61";
const GITHUB_REPO = "MyAppDownloads";
const DAYS_ALLOWED = 30;
const MAX_DEVICES = 2;
const SUPPORT_EMAIL = "gamacheapps@gmail.com";

export class LicenseStore extends DurableObject {
  async keyFor(sid, code) {
    const existing = await this.ctx.storage.get("key:" + sid);
    if (existing) return existing;
    const key = code + "-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    await this.ctx.storage.put("key:" + sid, key);
    await this.ctx.storage.put("meta:" + key, { code, sid, devices: [], created: Date.now() });
    return key;
  }
  async validate(key, app, device) {
    key = String(key || "").trim().toUpperCase().replace(/\s+/g, "");
    const meta = await this.ctx.storage.get("meta:" + key);
    if (!meta) return { ok: false, error: "Invalid license key." };
    if (meta.code !== app) return { ok: false, error: "This key is for a different app." };
    const devices = meta.devices || [];
    if (devices.includes(device)) return { ok: true };
    if (devices.length >= MAX_DEVICES) return { ok: false, error: "Too many devices." };
    devices.push(device);
    meta.devices = devices;
    await this.ctx.storage.put("meta:" + key, meta);
    return { ok: true };
  }
  async reset(key) {
    const meta = await this.ctx.storage.get("meta:" + key);
    if (!meta) return false;
    meta.devices = [];
    await this.ctx.storage.put("meta:" + key, meta);
    return true;
  }
}

function store(env) { return env.LICENSES.get(env.LICENSES.idFromName("main")); }
function cors() { return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" }; }
function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function page(title, body) { return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui;background:#0f172a;color:#fff;display:flex;justify-content:center;padding:40px} .card{background:#1e293b;padding:28px;border-radius:16px;max-width:520px;width:100%} .key{font-size:28px;background:#0f172a;padding:14px;border-radius:10px;text-align:center;letter-spacing:1px} a{color:#7dd3fc}</style></head><body><div class="card"><h1>${esc(title)}</h1>${body}<p style="opacity:.7">Questions? ${esc(SUPPORT_EMAIL)}</p></div></body></html>`, { headers: { "Content-Type": "text/html", ...cors() } }); }

async function checkPurchase(sid, env) {
  sid = String(sid || "").trim();
  if (!sid) return { error: "Missing purchase ID." };
  const key = (env.STRIPE_SECRET_KEY || "").trim();
  if (!key) return { error: "Stripe key not set." };
  const headers = { Authorization: `Bearer ${key}` };
  let session = null;
  if (sid.startsWith("cs_")) {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, { headers });
    const data = await res.json();
    if (data.error) return { error: data.error.message };
    session = data;
  } else if (sid.startsWith("pi_")) {
    const listRes = await fetch(`https://api.stripe.com/v1/checkout/sessions?limit=1&payment_intent=${encodeURIComponent(sid)}`, { headers });
    const list = await listRes.json();
    const found = list?.data?.[0];
    if (!found) return { error: "No Checkout Session found for this payment. Use the cs_ link from your receipt, or contact support." };
    session = found;
  } else {
    return { error: "Unknown purchase ID format." };
  }
  if (session.payment_status !== "paid") return { error: "Payment not marked paid." };
  const created = (session.created || 0) * 1000;
  if (Date.now() - created > DAYS_ALLOWED * 86400000) return { error: "This download link has expired." };
  const meta = session.metadata || {};
  const app = String(meta.app || meta.App || "").toUpperCase();
  const appUrl = meta.app_url || meta.App_URL || meta.appUrl || "";
  if (!app) return { error: "No app found for this purchase." };
  return { ok: true, app, appUrl, sid };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sid = url.searchParams.get("session_id") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors() });
    if (url.pathname === "/activate" && request.method === "POST") {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const key = String(body.key || "").trim().toUpperCase().replace(/\s+/g, "");
      const app = String(body.app || "").toUpperCase();
      const device = String(body.device || "unknown");
      const result = await store(env).validate(key, app, device);
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json", ...cors() } });
    }
    if (url.pathname === "/reset") {
      const key = String(url.searchParams.get("key") || "").trim().toUpperCase();
      const pass = url.searchParams.get("pass") || "";
      if (pass !== (env.ADMIN_PASS || "")) return new Response("Unauthorized", { status: 401 });
      const ok = await store(env).reset(key);
      return new Response(ok ? "Reset done." : "Key not found.");
    }
    if (url.pathname === "/download") {
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p><p>Purchase ID: <code>${esc(sid)}</code></p>`);
      const key = await store(env).keyFor(sid, result.app);
      const link = result.appUrl ? `<p><a href="${esc(result.appUrl)}">Open ${esc(result.app)} &rarr;</a></p>` : "";
      return page("Thank you for your purchase!", `<p>Your license key:</p><div class="key">${esc(key)}</div><p>Enter this key in the app to unlock it. It works on up to ${MAX_DEVICES} devices.</p>${link}`);
    }
    return page("Gamache Apps", `<p>Nothing here.</p>`);
  }
};