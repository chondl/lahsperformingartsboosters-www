/**
 * Entry Worker for the PAB site.
 *
 * Two responsibilities:
 *  1. HTTP (`fetch`): canonicalize host — 301 `www` → apex (preserving path + query) —
 *     then hand everything else to the static-assets binding, which serves the built
 *     site and honors the `_redirects` file (e.g. the `/donate/*` short links).
 *  2. Email (`email`): fan mail sent to donate@ out to several people. A single
 *     Cloudflare Email Routing rule can only forward to ONE destination, so the
 *     donate@ rule is set to "Send to a Worker" and the fan-out happens here.
 *     See docs/cloudflare-configuration.md §6d.
 */
const CANONICAL_HOST = "lahsperformingartsboosters.org";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *   donate@lahsperformingartsboosters.org — who receives it
 * ─────────────────────────────────────────────────────────────────────────────
 *   Mail to donate@ is delivered to this Worker (Cloudflare Email Routing rule
 *   "donate forwarding" → Send to a Worker) and forwarded to EVERY address below.
 *
 *   ── TO ADD OR REMOVE A PERSON ──
 *   1. In Cloudflare, add/keep their address as a *verified* Email Routing
 *      destination — they must click the verification link Cloudflare emails.
 *      `forward()` to an unverified address fails silently. (Dashboard: Email →
 *      Email Routing → Destination addresses; or the API — see
 *      docs/cloudflare-configuration.md §6b / §6d.)
 *   2. Edit the list below.
 *   3. Commit + push to `main` — Cloudflare Workers Builds redeploys automatically.
 *
 *   No other file needs to change. This is the single source of truth for the list.
 */
const DONATE_FORWARD_TO = [
  "gerribock@gmail.com",
  "chondl@gmail.com",
  "lahsmusictreasurer@gmail.com",
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${CANONICAL_HOST}`) {
      url.hostname = CANONICAL_HOST;
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },

  /**
   * Invoked by Cloudflare Email Routing for any address routed "to a Worker"
   * (currently only donate@). Forwards a copy to each DONATE_FORWARD_TO address.
   */
  async email(message) {
    const results = await Promise.allSettled(
      DONATE_FORWARD_TO.map((to) => message.forward(to)),
    );
    // If every forward failed (e.g. all destinations unverified), reject the
    // message so the sender gets a bounce instead of the mail silently vanishing.
    if (results.length > 0 && results.every((r) => r.status === "rejected")) {
      message.setReject("donate@ could not be delivered to any recipient");
    }
  },
};

// Exported for unit tests (test/email-worker.test.mjs). Not used at runtime.
export { DONATE_FORWARD_TO };
