// Gamache Apps — Stripe download delivery (Cloudflare Worker)
// Needs secrets: STRIPE_SECRET_KEY and GITHUB_TOKEN.
// Files live in a PRIVATE GitHub repo (set below).
// Each Stripe product needs metadata:  file = ExactFileName.html  (comma-separate for several files)

const GITHUB_OWNER = "gamache61";
const GITHUB_REPO = "MyAppDownloads"; // name of your private repo holding the full-version files
const DAYS_ALLOWED = 30; // how long the download link works after purchase
const SUPPORT_EMAIL = "gamacheapps@gmail.com";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const sid = url.searchParams.get("session_id") || "";

    if (url.pathname === "/download") {
      const result = await checkPurchase(sid, env);
      if (result.error) return page("Download problem", `<p>${esc(result.error)}</p>${help()}`, 403);
      const buttons = result.files.map(f =>
        `<a class="btn" href="/file?session_id=${encodeURIComponent(sid)}&f=${encodeURIComponent(f)}">Download ${esc(f)}</a>`
      ).join("");
      return page("Thank you for your purchase!",
        `<p>Your download is ready. Save this page — the link works for ${DAYS_ALLOWED} days.</p>${buttons}${help()}`);
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
      return page("Setup check", `<p>Files the download program can see:</p><p class="small">${names.map(esc).join("<br>") || "(none)"}</p>`);
    }

    return page("Gamache Apps", `<p>Nothing here.</p>`, 404);
  }
};

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

// Works for files of any size up to GitHub's 100 MB limit.
async function getFile(f, env) {
  const path = "contents/" + f.split("/").map(encodeURIComponent).join("/");
  const info = await gh(path, env, "application/vnd.github+json");
  if (!info.ok) return { error: `GitHub said ${info.status} for "${f}".` };
  const meta = await info.json();
  if (!meta || !meta.sha) return { error: `"${f}" is not a file.` };

  // Fetch the file contents by its ID (handles large files).
  const blob = await gh(`git/blobs/${meta.sha}`, env, "application/vnd.github.raw");
  if (blob.ok) return { body: blob.body };

  // Backup route.
  if (meta.download_url) {
    const d = await fetch(meta.download_url, { headers: { "User-Agent": "gamache-downloads" } });
    if (d.ok) return { body: d.body };
    return { error: `GitHub said ${blob.status}/${d.status} for "${f}".` };
  }
  return { error: `GitHub said ${blob.status} for "${f}".` };
}

async function checkPurchase(sid, env) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sid)) return { error: "This download link is not valid." };
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}?expand[]=line_items.data.price.product`,
    { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
  );
  if (!res.ok) return { error: "We couldn't find this purchase." };
  const s = await res.json();
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required")
    return { error: "This payment hasn't been completed." };
  const ageDays = (Date.now() / 1000 - s.created) / 86400;
  if (ageDays > DAYS_ALLOWED) return { error: "This download link has expired." };
  const files = [];
  for (const item of (s.line_items && s.line_items.data) || []) {
    const meta = (item.price && item.price.product && item.price.product.metadata) || {};
    (meta.file || "").split(",").map(x => x.trim()).filter(Boolean).forEach(x => files.includes(x) || files.push(x));
  }
  if (!files.length) return { error: "No download is attached to this product." };
  return { files };
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
.small{font-size:.85rem;opacity:.75;margin-top:20px}
a{color:#7fb8ff}
</style></head><body><div class="card"><h1>${esc(title)}</h1>${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
