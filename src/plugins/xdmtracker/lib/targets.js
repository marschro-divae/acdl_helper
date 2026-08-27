/**
 * Multi-org send targets.
 *
 * A "target" is a named destination = (one Adobe Web SDK instance + its own defaults
 * + its own options). Adobe requires one instance per Org (unique orgId AND unique
 * datastreamId each), so sending to n Orgs means sending to n named globals —
 * window.alloy, window.volkswagen, …
 *
 * This module is pure: it normalizes the declared targets, decides which targets an
 * event goes to, and turns (global defaults, target defaults, shared event definition,
 * per-target overlay) into the ordered XDM layers + the flattened semantic fields that
 * build_payload consumes.
 *
 * No `targets` in the plugin config → ONE implicit "alloy" target, which makes the
 * single-org case the n = 1 case of the same code path (see
 * DOCS/FEATURES/xdmtracker-multi-org-targets/README.md §5).
 */
import { is_obj } from "./paths.js"

/** The instance used when no targets are declared — today's hard-coded global. */
const IMPLICIT_INSTANCE = "alloy"

/** Fields that map into Adobe Analytics XDM (`_experience.analytics.*`). */
const AA_FIELDS = ["eVars", "props", "lists", "events"]

/**
 * Event-semantic and send-option fields — resolved "last wins" per layer rather than
 * merged per variable (unlike the XDM-building fields, which layer).
 */
const SEMANTIC_FIELDS = [
  "pageView",
  "fetchOnly",
  "eventType",
  "webInteractionName",
  "webInteractionType",
  "renderDecisions",
  "documentUnloading",
  "personalization",
  "datastreamId",
  "edgeConfigOverrides",
  "data",
  "gateTimeout",
]

/**
 * Which fields a TARGET may carry as a send option — deliberately only the
 * *transport* concerns, never the per-event semantics.
 *
 * `pageView` / `fetchOnly` / `eventType` / `webInteraction*` / `data` are excluded on
 * purpose: they describe what a single event *is*, and a target-level default would
 * silently reshape every event sent to that Org (e.g. turning every hit into a page
 * view). Those belong in the event definition or its per-target overlay.
 *
 * `personalization` is excluded too: at target level it is the boolean *capability*
 * flag ("this instance never receives personalization"), not an options object. So a
 * target cannot declare default personalization options — a deliberate trade-off for
 * a config that reads well (see the design doc, open decision 2).
 */
const TARGET_SEND_FIELDS = ["datastreamId", "edgeConfigOverrides", "documentUnloading", "gateTimeout"]

/** Copy the defined subset of `fields` from `src` onto `dst` (undefined never overwrites). */
function assign_defined(dst, src, fields) {
  if (!is_obj(src)) return dst
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i]
    if (src[f] !== undefined) dst[f] = src[f]
  }
  return dst
}

/** True when a definition layer carries any Adobe Analytics variable mapping. */
function has_aa_fields(def) {
  if (!is_obj(def)) return false
  return AA_FIELDS.some(f => def[f] !== undefined)
}

/** A shallow copy of a definition layer with the AA variable mappings removed. */
function without_aa_fields(def) {
  var out = {}
  for (var k in def) {
    if (!Object.prototype.hasOwnProperty.call(def, k)) continue
    if (AA_FIELDS.indexOf(k) >= 0) continue
    out[k] = def[k]
  }
  return out
}

/**
 * Normalize `config.targets` into an ordered array of target descriptors.
 * Primary first, then declaration order. Absent config → the single implicit target.
 */
export function normalize_targets(config, logger) {
  // Read `targets` only from an actual config object: `config && config.targets` would
  // yield null for a missing/null config and then trip the "invalid targets" error below,
  // so a plugin with no config at all would log a spurious error.
  var raw = is_obj(config) ? config.targets : undefined

  if (!is_obj(raw)) {
    if (raw !== undefined) {
      logger.error("xdmtracker config.targets must be an object — falling back to a single alloy target")
    }
    return [make_target(IMPLICIT_INSTANCE, {}, true)]
  }

  var keys = Object.keys(raw)
  if (keys.length === 0) {
    logger.warning("xdmtracker config.targets is empty — falling back to a single alloy target")
    return [make_target(IMPLICIT_INSTANCE, {}, true)]
  }

  var targets = []
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i],
      cfg = raw[key]
    if (!is_obj(cfg)) {
      logger.error('xdmtracker target "' + key + '" must be an object — target skipped')
      continue
    }
    if (cfg.instance !== undefined && (typeof cfg.instance !== "string" || !cfg.instance)) {
      logger.error('xdmtracker target "' + key + '": instance must be a non-empty string — target skipped')
      continue
    }
    targets.push(make_target(key, cfg, false))
  }

  if (targets.length === 0) {
    logger.error("xdmtracker config.targets declared no usable target — falling back to a single alloy target")
    return [make_target(IMPLICIT_INSTANCE, {}, true)]
  }

  // Two targets on the same global would send the same Org two hits per event.
  var seen = {}
  for (var j = 0; j < targets.length; j++) {
    var inst = targets[j].instance
    if (seen[inst]) {
      logger.warning(
        'xdmtracker targets "' + seen[inst] + '" and "' + targets[j].key +
          '" both use instance "' + inst + '" — that Org will receive every event twice'
      )
    } else {
      seen[inst] = targets[j].key
    }
  }

  // Primary first (explicit flag, else the first declared), rest in declaration order.
  var primary_index = targets.findIndex(t => t.primary === true)
  if (primary_index < 0) primary_index = 0
  targets[primary_index].primary = true
  var ordered = [targets[primary_index]].concat(targets.filter((_, k) => k !== primary_index))
  return ordered
}

/** Build one normalized target descriptor from its raw config. */
function make_target(key, cfg, implicit) {
  return {
    key: key,
    instance: cfg.instance || key,
    primary: cfg.primary === true,
    implicit: implicit === true,
    defaults: is_obj(cfg.defaults) ? cfg.defaults : null,
    use_global_defaults: cfg.useGlobalDefaults !== false,
    analytics: cfg.analytics !== false,
    personalization: cfg.personalization !== false,
    opt_in: cfg.optIn === true,
    enabled: cfg.enabled !== false,
    send_options: assign_defined({}, cfg, TARGET_SEND_FIELDS),
  }
}

/**
 * Validate the `targets` overlays used across a whole tracking definition, once at
 * definition-load time — so an unknown target key is reported when the definition is
 * registered instead of on every single track() call.
 */
export function validate_definition_targets(events, targets, logger) {
  if (!is_obj(events)) return
  var known = {}
  for (var i = 0; i < targets.length; i++) known[targets[i].key] = true

  for (var event_key in events) {
    if (!Object.prototype.hasOwnProperty.call(events, event_key)) continue
    var def = events[event_key]
    if (!is_obj(def) || !is_obj(def.targets)) continue
    for (var t in def.targets) {
      if (!Object.prototype.hasOwnProperty.call(def.targets, t)) continue
      if (!known[t]) {
        logger.warning('xdmtracker: event "' + event_key + '" references unknown target "' + t + '" — entry ignored')
        continue
      }
      var entry = def.targets[t]
      if (entry !== false && !is_obj(entry)) {
        logger.warning(
          'xdmtracker: event "' + event_key + '" target "' + t + '" must be an object or false (got ' +
            JSON.stringify(entry) + ") — treated as if absent, so the target still receives the shared definition"
        )
      }
    }
  }
}

/**
 * Decide which targets an event is sent to.
 *
 * Returns `[{ target, overlay }]` where `overlay` is the event's per-target entry
 * (an object) or null when the event says nothing about that target.
 *
 * Skip rules — a target does NOT receive the event when:
 *   - the target is disabled (`enabled: false`) — the one hard override,
 *   - the event excludes it (`targets: { <key>: false }`),
 *   - the target is `optIn: true` and the event does not name it,
 *   - the event is a `fetchOnly` personalization prefetch and the target declares
 *     `personalization: false` (a propositionFetch to a non-personalization Org is noise).
 *
 * "Explicit beats implicit": for the last two, an explicit overlay entry (even `{}`)
 * reads as "yes, this one too" and wins.
 */
export function resolve_send_targets(def, targets, logger) {
  var entries = is_obj(def) && is_obj(def.targets) ? def.targets : null
  var out = []

  for (var i = 0; i < targets.length; i++) {
    var target = targets[i]
    if (!target.enabled) continue

    var entry = entries ? entries[target.key] : undefined
    if (entry === false) continue
    // Anything that is neither an object nor false was already warned about at
    // definition-load time — treat it as absent rather than silently dropping an Org.
    var overlay = is_obj(entry) ? entry : null

    if (!overlay && target.opt_in) continue

    if (!overlay && def.fetchOnly === true && !target.personalization) continue

    out.push({ target: target, overlay: overlay })
  }

  return out
}

/**
 * Build the ordered XDM layers and the flattened semantic fields for one target.
 *
 * Layers (later wins per variable / per XDM path):
 *   1. global defaults      — skipped when useGlobalDefaults:false or the event is fetchOnly
 *   2. target defaults      — skipped when the event is fetchOnly
 *   3. shared event body    — skipped when the overlay sets extends:false
 *   4. the per-target overlay
 *
 * Capabilities (`analytics`, `personalization`) filter the INHERITED layers 1–3 only;
 * what the overlay states explicitly is always honored (with a warning when it
 * contradicts a declared capability). The plugin declines to *infer*, it never
 * overrides what was *written*.
 */
export function resolve_target_def(event_key, def, target, overlay, global_defaults, logger) {
  var has_overlay = is_obj(overlay)
  var extends_shared = !(has_overlay && overlay.extends === false)
  var tag = "[" + target.key + "] "

  // ── semantic fields: target send options → shared definition → overlay ──────────
  var semantics = {}
  assign_defined(semantics, target.send_options, SEMANTIC_FIELDS)
  if (extends_shared) assign_defined(semantics, def, SEMANTIC_FIELDS)

  // Capability: strip INHERITED personalization for a non-personalization target.
  if (!target.personalization) {
    delete semantics.renderDecisions
    delete semantics.personalization
  }

  if (has_overlay) {
    var explicit = assign_defined({}, overlay, SEMANTIC_FIELDS)
    if (!target.personalization && (explicit.renderDecisions !== undefined || explicit.personalization !== undefined)) {
      logger.warning(
        tag + 'event "' + event_key + '" sets renderDecisions/personalization for a target that declares ' +
          "personalization:false — honoring the explicit definition"
      )
    }
    assign_defined(semantics, explicit, SEMANTIC_FIELDS)
  }

  // extends:false drops the shared body wholesale — including its semantics. Losing
  // pageView silently would turn a page view into a link click for this Org, so say so.
  if (!extends_shared && def.pageView === true && semantics.pageView !== true) {
    logger.warning(
      tag + 'event "' + event_key + '" uses extends:false, which drops pageView from the shared ' +
        "definition — this target will send a link click. Set pageView in the overlay if that is not intended."
    )
  }

  // ── XDM layers ─────────────────────────────────────────────────────────────────
  var strip_aa = !target.analytics
  var is_fetch = semantics.fetchOnly === true
  var layers = []

  if (global_defaults && target.use_global_defaults && !is_fetch) {
    layers.push(strip_aa ? without_aa_fields(global_defaults) : global_defaults)
  }
  if (target.defaults && !is_fetch) {
    layers.push(strip_aa ? without_aa_fields(target.defaults) : target.defaults)
  }
  if (extends_shared) {
    layers.push(strip_aa ? without_aa_fields(def) : def)
  }
  if (has_overlay) {
    if (strip_aa && has_aa_fields(overlay)) {
      logger.warning(
        tag + 'event "' + event_key + '" writes eVars/props/lists/events for a target that declares ' +
          "analytics:false — honoring the explicit definition (the capability only filters inherited layers)"
      )
    }
    layers.push(overlay)
  }

  return { layers: layers, semantics: semantics }
}
