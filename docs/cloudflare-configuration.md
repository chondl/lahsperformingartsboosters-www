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
| `www` → apex redirect | `worker/index.js` (`fetch`) | **Yes** (repo) |
| `donate@` recipient list | `worker/index.js` (`email`, `DONATE_FORWARD_TO`) | **Yes** (repo) — see §6d |
| `/donate/*` short links | `public/_redirects` | **Yes** (repo) |
| `/bts` campaign short link | Cloudflare Single Redirect (API/dashboard) | No — see §7b |
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

**What:** Registered the forwarding destinations. Cloudflare emails a verification
link to each; an address must be verified before rules can use it.

```bash
for E in chondl@gmail.com lahsmusictreasurer@gmail.com gerribock@gmail.com sangum_desai@hotmail.com; do
  api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/email/routing/addresses" \
    --data "{\"email\":\"$E\"}"
done
```

- `lahsmusictreasurer@gmail.com` — auto-verified (it's the account owner email).
- `chondl@gmail.com` — verified by clicking the link Cloudflare emailed.
- `gerribock@gmail.com` — added 2026-07-16 for the `donate@` alias; **verified 2026-07-17**.
- `sangum_desai@hotmail.com` — added 2026-07-16 for the `donate@` alias; **verified 2026-07-19**.

**Verify:** `api ".../accounts/$ACCOUNT_ID/email/routing/addresses"` → all `verified=true`.
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

# donate@ -> multiple board members (one forward action with multiple values)
api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules" --data '{
  "name":"donate forwarding","enabled":true,
  "matchers":[{"type":"literal","field":"to","value":"donate@lahsperformingartsboosters.org"}],
  "actions":[{"type":"forward","value":["gerribock@gmail.com","chondl@gmail.com","lahsmusictreasurer@gmail.com"]}]
}'
```

| Address | Forwards to |
|---------|-------------|
| `president@lahsperformingartsboosters.org` | `chondl@gmail.com` |
| `treasurer@lahsperformingartsboosters.org` | `lahsmusictreasurer@gmail.com` |
| `donate@lahsperformingartsboosters.org` | fans out to several people via an Email Worker — recipient list in [`worker/index.js`](../worker/index.js) `DONATE_FORWARD_TO`; see **§6d**. |

**Note (2026-07-16):** the `donate@` rule was originally created (id
`676af611aee74964953dfdf56ec9c0ff`) forwarding only to `chondl@gmail.com` because the other
destinations were still unverified (the API rejects rules using unverified addresses, error
2054). **2026-07-17:** `gerribock@gmail.com` verified and was added; `lahsmusictreasurer@gmail.com`
(already verified, account owner) was also added.

**2026-07-18 — delivery bug (ROOT CAUSE: multiple destinations):** mail to `donate@`
bounced with `550 5.1.1 Address does not exist` while `president@`/`treasurer@` worked. The
difference: `donate@` was configured to forward to **three** destinations in one `forward`
action (`value: [a, b, c]`). **A single Cloudflare Email Routing rule forwards to exactly
ONE destination** — the API accepts a multi-value array but the resulting rule is invalid
and the address is never registered in the mail layer, hence the 550. (Confirmed via
Cloudflare docs; the dashboard only ever offers one "Send to an email" target per rule.)
Rule id is now `3152f52582164978bf73dc81ccbb2418` (the original `676af61…` was deleted while
debugging). **Chosen fix:** because `donate@` needs to reach several people, its rule is
set to **"Send to a Worker"** and the Worker fans the message out to each recipient — see
**§6d**. (Interim, before the Worker was wired up, `donate@` forwarded to a single address so
it delivered. Do NOT list multiple addresses in one `forward` action — the API accepts it but
the rule never registers.)

**Verify:** `api ".../zones/$ZONE_ID/email/routing/rules"`, or send a test email to each
address. **Undo:** `DELETE /zones/$ZONE_ID/email/routing/rules/{id}`.

### 6d. `donate@` multi-recipient fan-out (Email Worker)

**Why:** a single Email Routing rule forwards to exactly one destination (§6c note). To send
`donate@` to several board members, its rule is set to **Send to a Worker**, and the site
Worker's `email()` handler forwards a copy to each recipient.

**Where the recipient list lives — the ONE place to edit:**
[`worker/index.js`](../worker/index.js) → the `DONATE_FORWARD_TO` array. The same Worker also
serves the site (§9); the `email()` handler is independent of the `fetch()` handler.

**➤ To add or remove who receives `donate@`:**

1. **Verify the destination in Cloudflare** (only needed when *adding* someone new).
   `forward()` to an unverified address fails silently. Register + let them click the link:
   ```bash
   api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/email/routing/addresses" \
     --data '{"email":"newperson@example.com"}'
   # confirm verified=true before relying on it:
   api ".../accounts/$ACCOUNT_ID/email/routing/addresses"
   ```
2. **Edit the `DONATE_FORWARD_TO` array** in `worker/index.js` (add/remove the address).
3. **Commit + push to `main`.** Cloudflare Workers Builds redeploys automatically. Done —
   no Cloudflare rule change needed for membership edits.

`test/email-worker.test.mjs` covers the fan-out (run `node --test test/email-worker.test.mjs`).

**One-time wiring:** point the `donate@` rule at the Worker. This must happen *after* a
Worker build that includes the `email()` handler is live, else mail to `donate@` errors —
so the sequence is: merge/push the `email()` handler → wait for Workers Builds to deploy →
run the PUT below. (Until then, `donate@` stays on the interim single-address forward.)
```bash
# donate@ rule (id 3152f52582164978bf73dc81ccbb2418) -> Send to Worker
api -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules/3152f52582164978bf73dc81ccbb2418" --data '{
  "name":"donate forwarding","enabled":true,
  "matchers":[{"type":"literal","field":"to","value":"donate@lahsperformingartsboosters.org"}],
  "actions":[{"type":"worker","value":["lahsperformingartsboosters-www"]}]
}'
```
**Recipients (as of 2026-07-19):** `gerribock@gmail.com`, `chondl@gmail.com`,
`lahsmusictreasurer@gmail.com`, `sangum_desai@hotmail.com` — all four verified and in
`DONATE_FORWARD_TO`.

### 6e. Debugging `donate@` delivery (observability)

The Worker has **Workers Logs / Observability enabled** (`observability` block in
`wrangler.jsonc`, `head_sampling_rate: 1` = 100% of invocations). For every message to
`donate@`, the `email()` handler emits one structured line:

```json
{"event":"donate_email","from":"…","to":"donate@…","subject":"…","messageId":"…",
 "rawSize":2048,"delivery":[{"to":"gerribock@gmail.com","forwarded":true,"error":null}, …],
 "allFailed":false}
```

This answers both debugging questions for any specific email:
- **Was it received at Cloudflare from JotForm?** → a `donate_email` record with that
  `subject`/`from` exists (the handler only runs on a received message).
- **Was it actually forwarded to each person?** → the `delivery[]` array — one entry per
  recipient with `forwarded: true/false` and any `error`.

**Query the logs (historical):**
```bash
# POST /accounts/{id}/workers/observability/telemetry/query  — needs token scope
#   "Workers Observability: Write" (see §8).
api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/observability/telemetry/query" \
  --data '{
    "queryId":"donate-debug",
    "timeframe":{"from":<epoch_ms>,"to":<epoch_ms>},
    "parameters":{"datasets":["cloudflare-workers"],
      "filters":[{"key":"$metadata.message","operation":"includes","value":"donate_email"}]},
    "limit":50
  }'
```

**Live tail (real-time):** `wrangler tail lahsperformingartsboosters-www --format json`
(needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`; scope "Workers Tail: Read", though
`Workers Scripts: Edit` currently suffices). Note: `wrangler tail` shows only sender/recipient/
size for email events — the **subject and per-recipient result come from the `console.log`
record above**, not from tail's built-in email metadata.

**For messages that never reach the Worker** (rejected at SMTP, e.g. spam) there is no
`console.log`; those show only in the **Email Routing activity log** (dashboard, or GraphQL
`emailRoutingAdaptiveGroups` — token scope "Account Analytics: Read", §8).

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

## 7b. Single Redirects (campaign short links)

Some campaign short links are **Cloudflare Single Redirects** (Rules → Redirect Rules,
the `http_request_dynamic_redirect` ruleset), **not** in `public/_redirects`.

| Path | Redirects to | Status |
|------|--------------|--------|
| `/bts` | `https://form.jotform.com/lahsmusictreasurer/bts-2026` (preserves query string) | 302 |

Ruleset id `9afbdc4c0ace4da18463e51fb7dc4be1`; `/bts` rule id `2aff1a15efd64a7484ef0c9546d49403`.

**Editing via API** requires the **Zone → Single Redirect → Edit** scope (labeled
"Single Redirect" in the token UI, *not* "Dynamic Redirect"). This was added to the token
on 2026-07-17. Read/patch a rule:

```bash
# read
api "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_dynamic_redirect/entrypoint"
# patch the /bts target
api -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/9afbdc4c0ace4da18463e51fb7dc4be1/rules/2aff1a15efd64a7484ef0c9546d49403" --data '{
  "expression":"(http.request.uri.path eq \"/bts\")","action":"redirect",
  "action_parameters":{"from_value":{"preserve_query_string":true,"status_code":302,
    "target_url":{"value":"https://form.jotform.com/lahsmusictreasurer/bts-2026"}}}
}'
```

**Or in the dashboard:** Domain → **Rules → Redirect Rules** → open the rule → fix the
target → **Deploy**.

**Note (2026-07-17):** the `/bts` target had a typo (`bts-20226`); corrected to `bts-2026`
via the API after the Single Redirect scope was granted.

---

## 8. API token used

| | |
|---|---|
| Token name | `lahsperformingartsboosters-www-claude` |
| Account scopes | Workers Scripts:Edit · Account Settings:Read · Email Routing Addresses:Edit · **Workers Observability:Write** · **Account Analytics:Read** |
| Zone scopes (`lahsperformingartsboosters.org`) | DNS:Edit · Email Routing Rules:Edit · Single Redirect:Edit · Zone:Read · Zone Settings:Edit · Transform Rules:Edit |

Notes:
- This is **separate** from the deploy token Cloudflare auto-created for Workers Builds (§3).
- `Zone Settings:Edit` was used for §5 (Always Use HTTPS). `Transform Rules:Edit` was
  added to try to script the `www`→apex redirect, but it does **not** grant access to the
  Single-Redirect ruleset — that call returned `request is not authorized`, so the redirect
  was implemented in the Worker instead (§9) and this scope is unused.
- `Single Redirect:Edit` was added 2026-07-17 to edit the `/bts` redirect rule (§7b). Note
  the token UI labels this permission **"Single Redirect,"** not "Dynamic Redirect."
- `Workers Observability:Write` + `Account Analytics:Read` were added 2026-07-18 to debug
  `donate@` delivery (§6e): the first powers the Workers Logs telemetry query
  (`/workers/observability/telemetry/query`); the second powers the Email Routing activity
  log (GraphQL `emailRoutingAdaptiveGroups`). Both verified working 2026-07-18.
- **This token is still active for API-driven Cloudflare changes** (email rules §6, single
  redirects §7b). Ongoing content/deploy changes go via `git push`, not this token. Pare it
  back or revoke only if you stop making API-driven config changes. Manage at: My Profile →
  API Tokens.

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

The same Worker also exports an **`email()` handler** used only for `donate@`'s
multi-recipient fan-out (§6d); it is independent of `fetch()` and does not affect HTTP.

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
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://lahsperformingartsboosters.org/bts  # 302 -> jotform bts-2026
# email: send a test message to president@, treasurer@, and donate@lahsperformingartsboosters.org
```
