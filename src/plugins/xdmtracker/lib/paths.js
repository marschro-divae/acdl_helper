/**
 * Pure path utilities for navigating and building deep object structures.
 */

export function is_obj(v) {
  return v && typeof v === "object" && !Array.isArray(v)
}

/**
 * Parse a dot/bracket path into segments: "a.b[0].c" → ["a", "b", 0, "c"]
 * Regex matches either a property name (non-dot/bracket chars) or a bracket index ([0]).
 * Bracket indices are returned as numbers, property names as strings.
 */
export function parse_path(path) {
  var out = [],
    re = /[^.\[\]]+|\[(\d+)\]/g,
    m
  while ((m = re.exec(path))) out.push(m[1] !== undefined ? Number(m[1]) : m[0])
  return out
}

/**
 * Set a value at a deep path, creating intermediate objects/arrays as needed.
 * Differs from ensure(): stops before the last segment and assigns the value there.
 */
export function set_deep_path(obj, path, val) {
  var parts = Array.isArray(path) ? path : parse_path(path),
    cur = obj
  for (var i = 0; i < parts.length - 1; i++) {
    var k = parts[i],
      nxt = parts[i + 1]
    if (typeof nxt === "number") {
      if (!Array.isArray(cur[k])) cur[k] = []
    } else if (!is_obj(cur[k])) {
      cur[k] = {}
    }
    cur = cur[k]
  }
  cur[parts[parts.length - 1]] = val
  return obj
}

/**
 * Ensure all containers along a path exist, including the leaf. Returns the leaf container.
 * Differs from set_deep_path(): traverses ALL segments (no value assignment).
 */
export function ensure(obj, path) {
  var parts = parse_path(path),
    cur = obj
  for (var i = 0; i < parts.length; i++) {
    var k = parts[i],
      nxt = parts[i + 1]
    if (typeof nxt === "number") {
      if (!Array.isArray(cur[k])) cur[k] = []
    } else if (!is_obj(cur[k])) {
      cur[k] = {}
    }
    cur = cur[k]
  }
  return cur
}
