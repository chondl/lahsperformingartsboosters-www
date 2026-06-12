# Cloudflare Configuration Record

**Last updated:** 2026-06-12

This document records every change made to Cloudflare for
`lahsperformingartsboosters.org`. The hosting/build config lives in the repo
(`wrangler.jsonc`, `worker/index.js`, `public/_redirects`), but the **account-level
Cloudflare settings are not infrastructure-as-code** — they were applied via the
dashboard and the Cloudflare REST API. This file is the source of truth for those.

For each change you'll find: **what**, **how** (dashboard path or API call), **why**,
how to **verify**, and how to **undo / reproduce**.

---

## 1. Context

| Item | Value |
|------|-------|
| Domain / zone | `lahsperformingartsboosters.org` (registered + DNS hosted at Cloudflare) |
| Cloudflare account | "Lahsmusictreasurer@gmail.com's Account" |
| Hosting model | **Cloudflare Workers** with **Static Assets** + **Workers Builds** (Git-connected). Note: Cloudflare merged Pages into Workers, so this is a Worker, not a classic Pages project. |
| Worker / project name | `lahsperformingartsboosters-www` |
| GitHub repo | `github.com/chondl/lahsperformingartsboosters-www` (public), production branch `main` |
| Canonical URL | `https://lahsperformingartsboosters.org` (apex; `www` 301-redirects to it) |

**Discovering IDs** (needed for the API calls below). With an API token that has
`Zone:Read`:

```bash
ZJSON=$(curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=lahsperformingartsboosters.org")
ZONE_ID=$(echo "$ZJSON"   | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["id"])')
ACCOUNT_ID=$(echo "$ZJSON"| python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["account"]["id"])')
```

All API examples below assume:

```bash
api() { curl -sS -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" "$@"; }
```

---

## 2. What's in the repo vs. what's in Cloudflare

| Concern | Where it lives | IaC? |
|---------|----------------|------|
| Build & deploy commands | Cloudflare Workers Builds (dashboard) | No — see §3 |
| Static-assets + Worker config | `wrangler.jsonc` | **Yes** (repo) |
| `www` → apex redirect | `worker/index.js` | **Yes** (repo) |
| `/donate/*` short links | `public/_redirects` | **Yes** (repo) |
| Custom domains (apex + www) | Cloudflare API | No — see §4 |
| Always Use HTTPS | Cloudflare API (zone setting) | No — see §5 |
| Email routing (enable, addresses, rules) | Dashboard + API | No — see §6 |
| DNS records | Auto-created by the above | No — see §7 |

---

## 3. Workers project + Git build pipeline  *(dashboard, owner-performed)*

**What:** Created the Worker and connected it to the GitHub repo so every push to
`main` builds and deploys automatically.

**How (dashboard):** Workers & Pages → **Create** → **Import a repository** → authorized
the Cloudflare GitHub app for `chondl/lahsperformingartsboosters-www`, then:

| Field | Value |
|-------|-------|
| Project name | `lahsperformingartsboosters-www` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Production branch | `main` |
| API token | **"Create new token"** → Cloudflare auto-created a deploy token (managed by Cloudflare, separate from the token in §8) |

**Why:** Continuous deployment; non-technical maintainers can edit Markdown in GitHub's
web UI and the site rebuilds with no local tooling.

**Verify:** Push any commit to `main`; the Workers Builds tab shows the build, and the
change appears at the live URL within ~1–2 min.

**Reproduce:** Same dashboard flow. The build is driven by `wrangler.jsonc` in the repo
(§ below). The GitHub-app authorization is interactive and cannot be done via API.

### `wrangler.jsonc` (in repo — the deploy contract)

```jsonc
{
  "name": "lahsperformingartsboosters-www",
  "compatibility_date": "2025-11-01",
  "workers_dev": false,            // site serves ONLY on the custom domain
  "main": "./worker/index.js",     // entry Worker (host canonicalization)
  "assets": {
    "directory": "./dist",         // Astro build output
    "binding": "ASSETS",           // worker forwards non-redirect traffic here
    "run_worker_first": true       // worker runs before asset matching (needed for the www redirect)
  }
}
```

`workers_dev: false` disables the `*.workers.dev` URL — it now returns HTTP 404, and the
site is reachable only on the custom domain.

---

## 4. Custom domains (apex + www)  *(API)*

**What:** Attached `lahsperformingartsboosters.org` and `www.lahsperformingartsboosters.org`
as custom domains on the Worker. This auto-creates the proxied DNS records and provisions
the edge TLS certificates.

**How (API):**

```bash
for HOST in lahsperformingartsboosters.org www.lahsperformingartsboosters.org; do
  api -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/domains" \
    --data "{\"environment\":\"production\",\"hostname\":\"$HOST\",\"service\":\"lahsperformingartsboosters-www\",\"zone_id\":\"$ZONE_ID\"}"
done
```

**Why:** Serve the site on the real domain (apex canonical; `www` is attached so it
resolves + has a cert, then the Worker 301s it to apex — see §9).

**Verify:**

```bash
api "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/domains"
curl -sI https://lahsperformingartsboosters.org/ | head -1     # 200, valid cert
```

**Undo:** `DELETE /accounts/$ACCOUNT_ID/workers/domains/{id}` (get `{id}` from the verify
call), or remove the domain under the Worker → Settings → Domains & Routes.

---

## 5. Always Use HTTPS  *(API — zone setting)*

**What:** Force every `http://` request to 301-redirect to `https://`.

**How (API):** *(requires `Zone Settings:Edit`)*

```bash
api -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
  --data '{"value":"on"}'
```

**Verify:**

```bash
curl -sI http://lahsperformingartsboosters.org/ | grep -i '^location'   # -> https://...
api "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https"
```

**Undo:** same `PATCH` with `{"value":"off"}`, or SSL/TLS → Edge Certificates →
Always Use HTTPS → Off.

---

## 6. Email Routing  *(dashboard enable + API for addresses & rules)*

Forwards organization addresses to personal inboxes. Forwarding only — no mailboxes.

### 6a. Enable Email Routing  *(dashboard — owner-performed)*

**What/why:** Turns on Email Routing and provisions the required MX/TXT (SPF) DNS records
(§7). The enable switch could **not** be flipped with our API token (returned an
authentication error), so it was done in the dashboard.

**How:** Domain → **Email** → **Email Routing** → **Get started / Enable** → "Add records
and enable".

### 6b. Destination addresses  *(API)*

**What:** Registered the two forwarding destinations. Cloudflare emails a verification
link to each; an address must be verified before rules can use it.

```bash
for E in chondl@gmail.com lahsmusictreasurer@gmail.com; do
  api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/email/routing/addresses" \
    --data "{\"email\":\"$E\"}"
done
```

- `lahsmusictreasurer@gmail.com` — auto-verified (it's the account owner email).
- `chondl@gmail.com` — verified by clicking the link Cloudflare emailed.

**Verify:** `api ".../accounts/$ACCOUNT_ID/email/routing/addresses"` → both `verified=true`.
**Undo:** `DELETE /accounts/$ACCOUNT_ID/email/routing/addresses/{id}`.

### 6c. Routing rules  *(API)*

**What:** Forward each org address to its destination.

```bash
# president@ -> chondl@gmail.com
api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules" --data '{
  "name":"president forwarding","enabled":true,
  "matchers":[{"type":"literal","field":"to","value":"president@lahsperformingartsboosters.org"}],
  "actions":[{"type":"forward","value":["chondl@gmail.com"]}]
}'

# treasurer@ -> lahsmusictreasurer@gmail.com
api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules" --data '{
  "name":"treasurer forwarding","enabled":true,
  "matchers":[{"type":"literal","field":"to","value":"treasurer@lahsperformingartsboosters.org"}],
  "actions":[{"type":"forward","value":["lahsmusictreasurer@gmail.com"]}]
}'
```

| Address | Forwards to |
|---------|-------------|
| `president@lahsperformingartsboosters.org` | `chondl@gmail.com` |
| `treasurer@lahsperformingartsboosters.org` | `lahsmusictreasurer@gmail.com` |

**Verify:** `api ".../zones/$ZONE_ID/email/routing/rules"`, or send a test email to each
address. **Undo:** `DELETE /zones/$ZONE_ID/email/routing/rules/{id}`.

---

## 7. DNS records (auto-created)

None were created by hand. The following were generated automatically and can be viewed
under **DNS → Records**:

| Created by | Records |
|------------|---------|
| Custom-domain attach (§4) | Proxied records for `lahsperformingartsboosters.org` (apex) and `www` pointing at the Worker |
| Email Routing enable (§6a) | 3× **MX** → `route1/route2/route3.mx.cloudflare.net`; 1× **TXT** SPF → `v=spf1 include:_spf.mx.cloudflare.net ~all` |

Inspect any time:

```bash
api "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  | python3 -c 'import sys,json;[print(r["type"],r["name"],"->",r["content"],"proxied="+str(r.get("proxied"))) for r in json.load(sys.stdin)["result"]]'
```

---

## 8. API token used

| | |
|---|---|
| Token name | `lahsperformingartsboosters-www-claude` |
| Account scopes | Workers Scripts:Edit · Account Settings:Read · Email Routing Addresses:Edit |
| Zone scopes (`lahsperformingartsboosters.org`) | DNS:Edit · Email Routing Rules:Edit · Zone:Read · Zone Settings:Edit · Transform Rules:Edit |

Notes:
- This is **separate** from the deploy token Cloudflare auto-created for Workers Builds (§3).
- `Zone Settings:Edit` was used for §5 (Always Use HTTPS). `Transform Rules:Edit` was
  added to try to script the `www`→apex redirect, but it does **not** grant access to the
  Single-Redirect (dynamic-redirect) ruleset — that call returned `request is not
  authorized`. The redirect was implemented in the Worker instead (§9), so this scope ended
  up unused.
- **This token can be revoked or pared back now** — all ongoing changes deploy via
  `git push`, not this token. Keep it only if future API-driven Cloudflare changes are
  expected. Revoke at: My Profile → API Tokens.

---

## 9. `www` → apex redirect — why it's in code, not a Cloudflare rule

The canonical-host redirect (`www` → apex, 301, preserving path + query) would normally be
a Cloudflare **Single Redirect / Redirect Rule**. Our API token could not create one (the
`http_request_dynamic_redirect` ruleset returned `request is not authorized`, and the
exact permission was unclear).

Rather than chase token permissions, the redirect is implemented in **`worker/index.js`**
(version-controlled, deploys via the normal pipeline, needs no Cloudflare permission):

```js
const CANONICAL_HOST = "lahsperformingartsboosters.org";
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST; url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);   // serve static site + _redirects
  },
};
```

`run_worker_first: true` in `wrangler.jsonc` ensures the Worker runs before static-asset
matching, so the `www` redirect fires even for paths that exist as assets.

**If you ever prefer a native Cloudflare redirect instead:** Rules → Redirect Rules →
create `www`→apex (301, dynamic expression
`concat("https://lahsperformingartsboosters.org", http.request.uri.path)`, preserve query),
then delete the `www` branch from `worker/index.js`.

---

## 10. Full verification (run anytime)

```bash
curl -sI https://lahsperformingartsboosters.org/            | head -1   # 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://lahsperformingartsboosters.org/        # 301 -> https
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.lahsperformingartsboosters.org/  # 301 -> apex
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://lahsperformingartsboosters.org/donate/mbcg  # 302 -> jotform
# email: send a test message to president@ and treasurer@lahsperformingartsboosters.org
```
