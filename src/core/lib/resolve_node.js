/**
 * Resolve the data layer node an event refers to — the rules of `catch(event).get()` (event_catcher.js),
 * as one core function for new consumers. Existing users switch to it in 1.12.0 (DOCS/FEATURES/jentis-bridge).
 *
 * - Accepts a raw ACDL event (`{ event, eventInfo }`, as a data layer listener receives it) or a
 *   Launch-wrapped one (`{ $type, message }`) — no `$type` shim needed.
 * - Path: `eventInfo.reference`, else `eventInfo.path`.
 * - State source: `get_state` (e.g. a listener's `this.getState`, or a reconstructed state for replayed
 *   events), else `window.adobeDataLayer.getState`.
 * - Adds `dlh:ownPath`, `dlh:ownId`, `dlh:parentComponent` like `catch` — on a copy, the state is not mutated.
 * - Anything unresolvable → `undefined`; never throws.
 */
export function resolve_node(event, { get_state } = {}) {
  const message = event && typeof event === "object" && event.$type && event.message ? event.message : event
  if (!message || typeof message !== "object") return undefined

  const info = message.eventInfo
  const path = has(info, "reference") ? info.reference : has(info, "path") ? info.path : null
  if (!path || typeof path !== "string") return undefined

  const source = typeof get_state === "function" ? get_state : default_state_source()
  if (!source) return undefined

  let node
  try {
    node = source(path)
  } catch (_e) {
    return undefined
  }
  if (!node || typeof node !== "object") return undefined

  const segments = path.split(".")
  return {
    ...node,
    "dlh:ownPath": path,
    "dlh:ownId": segments[segments.length - 1],
    "dlh:parentComponent": node.parentId ? beautify_parent(node.parentId) : undefined,
  }
}

function has(obj, key) {
  return Boolean(obj) && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, key)
}

function default_state_source() {
  const dl = typeof window !== "undefined" ? window.adobeDataLayer : undefined
  return dl && typeof dl.getState === "function" ? (path) => dl.getState(path) : undefined
}

function beautify_parent(parent_id) {
  return parent_id.includes("-") ? parent_id.split("-")[0] : parent_id
}
