/**
 * Entry Worker for the PAB site.
 *
 * Its only job is to canonicalize the host: requests to the `www` subdomain are
 * 301-redirected to the bare apex domain (preserving path + query). Everything
 * else is handed to the static-assets binding, which serves the built site and
 * honors the `_redirects` file (e.g. the `/donate/*` short links).
 */
const CANONICAL_HOST = "lahsperformingartsboosters.org";

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
};
