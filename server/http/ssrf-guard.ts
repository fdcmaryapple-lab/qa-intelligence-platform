/**
 * Blocks the one class of target that's genuinely dangerous for a server
 * to fetch on a user's behalf: cloud metadata endpoints, which can expose
 * instance credentials/secrets to anyone who can make the server issue a
 * request to them (the canonical SSRF impact).
 *
 * Deliberately does NOT block localhost or private IP ranges (10.x,
 * 172.16-31.x, 192.168.x) — testing your own local/internal APIs is the
 * actual point of this feature for a QA tool, not a bug to prevent.
 *
 * What this does NOT do, and why that's an accepted tradeoff here:
 *  - No DNS resolution check. A hostname that resolves to a blocked IP
 *    (DNS rebinding) would pass this check, since it only inspects the
 *    literal hostname/IP text in the URL, not what it resolves to at
 *    request time. Closing that gap needs resolving DNS before connecting
 *    and pinning the connection to the checked IP — real work, not
 *    justified for a single-user local dev tool. Needed before any
 *    multi-tenant use of this feature.
 *  - No allowlist/denylist configuration — the blocked set is fixed and
 *    small on purpose, matching the "block the actually dangerous thing,
 *    allow everything else" goal above.
 */

const BLOCKED_HOSTNAMES = new Set([
  "169.254.169.254", // AWS, DigitalOcean, and most others' metadata IP
  "metadata.google.internal", // GCP
  "metadata.azure.com", // Azure (some configurations)
]);

function isLinkLocalIPv4(hostname: string): boolean {
  const match = hostname.match(/^169\.254\.\d{1,3}\.\d{1,3}$/);
  return match !== null;
}

export interface SsrfCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkUrlAllowed(rawUrl: string): SsrfCheckResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: "Not a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      allowed: false,
      reason: `Only http:// and https:// URLs are allowed (got "${parsed.protocol}").`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname) || isLinkLocalIPv4(hostname)) {
    return {
      allowed: false,
      reason: "This URL targets a cloud metadata endpoint, which is blocked for safety.",
    };
  }

  return { allowed: true };
}
