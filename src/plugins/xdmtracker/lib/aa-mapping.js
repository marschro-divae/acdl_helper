/**
 * Adobe Analytics XDM mapping helpers.
 * Maps event1–event1000 to the correct XDM bucket path and
 * coerces eVars/props/lists/events arrays into XDM structures.
 */
import { set_deep_path, is_obj } from "./paths.js"
import { resolve } from "./resolve.js"

function to_number_or(v, fallback) {
  var n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/**
 * Map "event123" → its XDM bucket path, or null if out of range.
 * Adobe Analytics events are grouped in buckets of 100 in the XDM schema:
 * event1–100 → _experience.analytics.event1to100, event101–200 → event101to200, etc.
 */
export function event_path_for(name) {
  var m = /^event(\d+)$/.exec(name)
  if (!m) return null
  var n = parseInt(m[1], 10)
  if (n >= 1 && n <= 100) return "_experience.analytics.event1to100.event" + n
  if (n <= 200) return "_experience.analytics.event101to200.event" + n
  if (n <= 300) return "_experience.analytics.event201to300.event" + n
  if (n <= 400) return "_experience.analytics.event301to400.event" + n
  if (n <= 500) return "_experience.analytics.event401to500.event" + n
  if (n <= 600) return "_experience.analytics.event501to600.event" + n
  if (n <= 700) return "_experience.analytics.event601to700.event" + n
  if (n <= 800) return "_experience.analytics.event701to800.event" + n
  if (n <= 900) return "_experience.analytics.event801to900.event" + n
  if (n <= 1000) return "_experience.analytics.event901to1000.event" + n
  return null
}

/**
 * Coerce an events array into XDM.
 * Supports strings ("event48", "event48=22"), objects ({ event48: 3 }),
 * and function values that resolve against component state.
 */
export function coerce_events_into_xdm(xdm, events, cmp, logger) {
  if (!Array.isArray(events)) return

  function set_event(path, val) {
    set_deep_path(xdm, path, { value: to_number_or(val, 1) })
  }

  for (var i = 0; i < events.length; i++) {
    var e = resolve(events[i], cmp, logger)

    // String form: "event48" or "event48=22" (counter with explicit value)
    if (typeof e === "string") {
      var idx = e.indexOf("="),
        name = idx >= 0 ? e.slice(0, idx).trim() : e.trim(),
        raw = idx >= 0 ? e.slice(idx + 1) : undefined,
        path = event_path_for(name)

      if (!path) {
        logger.warning("unknown event:", e)
        continue
      }
      set_event(path, raw != null ? raw : 1)
      continue
    }

    // Object form: { event48: 3 } or { event48: (cmp) => cmp.count }
    if (is_obj(e)) {
      for (var k in e) {
        if (!Object.prototype.hasOwnProperty.call(e, k)) continue
        var p = event_path_for(k)
        if (!p) {
          logger.warning("unknown event:", k)
          continue
        }
        var v = resolve(e[k], cmp, logger)
        set_event(p, v != null ? v : 1)
      }
      continue
    }

    logger.warning("unsupported event descriptor:", e)
  }
}

/**
 * Coerce a key-value array (eVars, props, lists) into XDM at base_path.
 * Each array item is an object like { eVar4: "value" } or { eVar4: (cmp) => cmp.x }.
 */
export function coerce_kv_array_into_xdm(xdm, arr, base_path, cmp, logger) {
  if (!Array.isArray(arr)) return
  for (var i = 0; i < arr.length; i++) {
    var item = resolve(arr[i], cmp, logger)
    if (!is_obj(item)) {
      logger.warning("bad kv item:", item)
      continue
    }
    for (var k in item) {
      if (!Object.prototype.hasOwnProperty.call(item, k)) continue
      var v = resolve(item[k], cmp, logger)
      // AA eVars and props must be strings; lists can hold non-string values (e.g. delimited arrays)
      if (v != null && (base_path.indexOf(".eVars") > 0 || base_path.indexOf(".props") > 0)) {
        v = String(v)
      }
      set_deep_path(xdm, base_path + "." + k, v)
    }
  }
}
