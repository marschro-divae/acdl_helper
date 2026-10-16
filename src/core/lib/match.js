/**
 * Wildcard matcher for data layer nodes — the semantics of the existing matchers (`event_catcher.js`,
 * `page/lib/test_dataLayer_object.js`), as one core function for new consumers. The existing two switch to it
 * in 1.12.0 (DOCS/FEATURES/jentis-bridge §8).
 *
 * - `test` is an object of field → expected value; none / empty → `Boolean(node)`.
 * - String fields: wildcard pattern (`*` = any characters, everything else literal, anchored).
 * - Other fields: strict equality, and the field must exist on the node.
 * - `all` (default `true`): every field must match; `all: false` → at least one.
 * Where the old matchers throw (non-object node, non-string pattern on a string field) this returns `false`.
 */
export function matches(node, test, { all = true } = {}) {
  if (!node || typeof node !== "object") return false
  const conditions = test && typeof test === "object" ? Object.keys(test) : []
  if (conditions.length === 0) return true

  const hits = conditions.filter((key) => field_matches(node, key, test[key])).length
  return all ? hits === conditions.length : hits > 0
}

function field_matches(node, key, expected) {
  const actual = node[key]
  if (typeof actual === "string") {
    return typeof expected === "string" && wildcard_to_regexp(expected).test(actual)
  }
  return Object.prototype.hasOwnProperty.call(node, key) && actual === expected
}

function wildcard_to_regexp(pattern) {
  return new RegExp("^" + pattern.split(/\*+/).map(escape_regexp).join(".*") + "$")
}

function escape_regexp(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
}
