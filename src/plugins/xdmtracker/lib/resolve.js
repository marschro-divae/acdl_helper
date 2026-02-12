/**
 * Resolve a value that may be a function against the current component state.
 * Non-function values pass through unchanged.
 */
export function resolve(v, cmp, logger) {
  if (typeof v !== "function") return v
  try {
    return v(cmp)
  } catch (err) {
    logger.error("resolver error:", err)
    return undefined
  }
}
