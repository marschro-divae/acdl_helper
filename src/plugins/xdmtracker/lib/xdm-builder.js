/**
 * XDM object orchestration — merges object-style and pair-style XDM definitions,
 * then maps eVars/props/lists/events into the correct Adobe Analytics XDM structure.
 */
import { set_deep_path, ensure, is_obj } from "./paths.js"
import { resolve } from "./resolve.js"
import { coerce_events_into_xdm, coerce_kv_array_into_xdm } from "./aa-mapping.js"

/** Deep-merge an XDM object, resolving any function values against component state. */
export function merge_xdm_object(xdm, xdm_obj, cmp, logger, base_path) {
  if (base_path === undefined) base_path = ""
  if (!is_obj(xdm_obj)) return
  for (var k in xdm_obj) {
    if (!Object.prototype.hasOwnProperty.call(xdm_obj, k)) continue
    var v = xdm_obj[k],
      path = base_path ? base_path + "." + k : k
    if (is_obj(v)) merge_xdm_object(xdm, v, cmp, logger, path)
    else set_deep_path(xdm, path, resolve(v, cmp, logger))
  }
}

/** Apply XDM pairs: [ ["a.b[0].c", value|fn], ... ] */
export function apply_xdm_pairs(xdm, pairs, cmp, logger) {
  if (!Array.isArray(pairs)) return
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i]
    if (!Array.isArray(pair) || pair.length < 2) {
      logger.warn("bad xdm pair:", pair)
      continue
    }
    set_deep_path(xdm, pair[0], resolve(pair[1], cmp, logger))
  }
}

/**
 * Build the complete XDM object from a tracking definition.
 * Handles xdm (object or pairs), xdmPairs, eVars, props, lists, and events.
 * Accepts an optional base xdm object to build on top of (used for defaults → event layering).
 */
export function build_xdm(def, cmp, logger, xdm) {
  if (!xdm) xdm = {}

  // Processing order: custom xdm first, then AA mappings.
  // This lets eVars/props/events override any conflicting paths set via xdm/xdmPairs.
  if (def.xdm) {
    if (Array.isArray(def.xdm)) apply_xdm_pairs(xdm, def.xdm, cmp, logger)
    else merge_xdm_object(xdm, def.xdm, cmp, logger)
  }

  // additional xdmPairs
  if (def.xdmPairs) {
    apply_xdm_pairs(xdm, def.xdmPairs, cmp, logger)
  }

  // Map eVars/props/lists/events — only create AA containers when needed
  if (def.eVars) {
    ensure(xdm, "_experience.analytics.customDimensions.eVars")
    coerce_kv_array_into_xdm(xdm, def.eVars, "_experience.analytics.customDimensions.eVars", cmp, logger)
  }
  if (def.props) {
    ensure(xdm, "_experience.analytics.customDimensions.props")
    coerce_kv_array_into_xdm(xdm, def.props, "_experience.analytics.customDimensions.props", cmp, logger)
  }
  if (def.lists) {
    ensure(xdm, "_experience.analytics.customDimensions.lists")
    coerce_kv_array_into_xdm(xdm, def.lists, "_experience.analytics.customDimensions.lists", cmp, logger)
  }
  if (def.events) {
    coerce_events_into_xdm(xdm, def.events, cmp, logger)
  }

  return xdm
}
