import { matches } from "./match.js"

/**
 * Classify a link URL for reporting. Pure: configuration is passed in.
 *
 * - `mailto` / `tel` by scheme; other non-web schemes (`javascript:`, `whatsapp:` …) → `other`.
 * - `internal`: relative URLs (path, `#anchor`, `?query`) and absolute ones on `current_host`.
 * - `download`: an internal URL under `/content/dam/` (AEM assets) — a DAM path on a third-party host is
 *   `external`, not a download of this site.
 * - `partner`: the host is in `partner_hosts` (the project's sister sites — labelled, not counted as internal:
 *   whether a click to them is an exit is a reporting decision). Entries may be hosts or URLs; matched exactly
 *   on the host name, case-insensitive. No wildcards.
 * - `external`: any other host. Empty, non-string or unparseable → `undefined` (omit the property).
 */
export function link_type(url, { partner_hosts = [], current_host } = {}) {
  if (typeof url !== "string" || !url.trim()) return undefined
  const value = url.trim()

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1]?.toLowerCase()
  if (scheme === "mailto" || scheme === "tel") return scheme
  if (scheme && scheme !== "http" && scheme !== "https") return "other"

  const own_host = (current_host || (typeof location !== "undefined" ? location.hostname : "") || "").toLowerCase()
  const is_absolute = Boolean(scheme) || value.startsWith("//")

  let host = own_host
  let path = value
  if (is_absolute) {
    try {
      const parsed = new URL(value.startsWith("//") ? `https:${value}` : value)
      host = parsed.hostname.toLowerCase()
      path = parsed.pathname
    } catch (_e) {
      return undefined
    }
    if (!host) return undefined
  }

  if (host === own_host) return path.includes("/content/dam/") ? "download" : "internal"
  if (normalize_hosts(partner_hosts).includes(host)) return "partner"
  return "external"
}

/**
 * Family of a component for grouping — first `[pattern, family]` whose wildcard pattern matches the `@type`,
 * else `"other"`. Accepts the `@type` string or a node. Pure: `families` is passed in; invalid entries skipped.
 */
export function family(cmp_or_type, families = []) {
  const type = typeof cmp_or_type === "string" ? cmp_or_type : cmp_or_type?.["@type"]
  if (typeof type !== "string" || !Array.isArray(families)) return "other"
  const hit = families.find(
    (entry) =>
      Array.isArray(entry) &&
      typeof entry[0] === "string" &&
      typeof entry[1] === "string" &&
      matches({ "@type": type }, { "@type": entry[0] })
  )
  return hit ? hit[1] : "other"
}

function normalize_hosts(hosts) {
  if (!Array.isArray(hosts)) return []
  return hosts
    .map((entry) => {
      if (typeof entry !== "string" || !entry.trim()) return null
      const value = entry.trim()
      try {
        return (
          new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase() || null
        )
      } catch (_e) {
        return null
      }
    })
    .filter(Boolean)
}
