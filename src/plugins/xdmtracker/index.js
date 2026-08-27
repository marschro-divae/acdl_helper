/**
 * PLUGIN: xdmtracker
 *
 * Transforms declarative tracking definitions into Adobe XDM payloads
 * and sends them via alloy("sendEvent", ...).
 *
 * Sends to one Web SDK instance by default (window.alloy) and to n named instances
 * when `targets` is configured — one instance per Adobe Org (see lib/targets.js and
 * DOCS/FEATURES/xdmtracker-multi-org-targets).
 *
 * Usage:
 *   acdl_helper.xdmtracker.define({ events: {...}, defaults: {...} })
 *   acdl_helper.xdmtracker.track(event)
 *   acdl_helper.xdmtracker.track(event, send_opts)
 */
import { build_payload } from "./lib/payload.js"
import {
  normalize_targets,
  resolve_send_targets,
  resolve_target_def,
  validate_definition_targets,
} from "./lib/targets.js"

// Default time (ms) a page view waits for a prior personalization render to settle
// before sending anyway. Guarantees tracking can never hang on a render that
// stalls or never resolves (overridable per event via def.gateTimeout).
const GATE_TIMEOUT_MS = 2000

/** A promise that resolves after `ms` — the render-gate safety timeout. */
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** No-op, used to normalize the render promise to a never-rejecting settle signal. */
function noop() {}

export default function xdmtracker() {
  const meta = {
    name: "xdmtracker",
    dependencies: [],
    events: [],
    config: {},
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      // Normalized ONCE here (the plugin context is frozen, so it cannot be cached on
      // it, and impl() creates both closures) — otherwise every config warning would
      // be logged twice, from init() and from provider().
      const targets = normalize_targets(context.config, context.logger)
      return {
        init: init(context, targets),
        provider: provider(context, targets),
      }
    },
  }

  function init(context, targets) {
    return function () {
      // One error per configured instance that is missing. With multiple Orgs the
      // base code array is the easiest thing to get wrong (an instance configured in
      // Launch but absent from ["alloy","volkswagen"], or a name typo), and a silent
      // no-send to the second Org would only surface months later as an empty report.
      targets.forEach(target => {
        if (typeof window[target.instance] !== "function") {
          context.logger.error(
            target.implicit
              ? "Adobe Web SDK (alloy.js) is missing. Please install the extension via Adobe Data Collection or manually"
              : `Adobe Web SDK instance "${target.instance}" (target "${target.key}") is missing. ` +
                  "Declare it in the Web SDK base code array and configure it in the Web SDK extension"
          )
        }
      })
    }
  }

  function provider(context, targets) {
    let _definition = {}
    let _defaults = null
    let _defined = false
    // Render gates, keyed by target: a promise that settles when that target's most
    // recent renderDecisions event has finished rendering. A later event asking for
    // personalization.includeRenderedPropositions waits on it (one-shot) so the
    // rendered propositions are available to fold into that single hit.
    //
    // PER TARGET, not global: a render finishing on window.alloy says nothing about
    // window.volkswagen's render, so one shared gate would let an unrelated Org's
    // render release — or block — this Org's page view.
    const _render_gates = {}

    // Declared send targets (one Web SDK instance per Adobe Org). Absent config →
    // a single implicit "alloy" target, making single-org the n = 1 case of one code path.
    const _targets = targets
    const _multi_target = !(_targets.length === 1 && _targets[0].implicit)

    /**
     * Validate a tracking definition and store it. Shared by the public
     * define() method and the config-time path below. Returns true on success.
     *
     * `source` only tweaks the log/error wording ("define()" vs "config") so
     * integrators can tell which path produced a message.
     */
    function load_definition(config, source) {
      const label = source === "config" ? "xdmtracker config" : "define()"
      if (!config || typeof config !== "object" || Array.isArray(config)) {
        context.logger.error(`${label} expects a config object: { events: {...}, defaults?: {...} }`)
        return false
      }
      if (!config.events || typeof config.events !== "object" || Array.isArray(config.events)) {
        context.logger.error(`${label} requires config.events to be an object`)
        return false
      }
      if (config.defaults != null && (typeof config.defaults !== "object" || Array.isArray(config.defaults))) {
        context.logger.error(`${label}: config.defaults must be an object`)
        return false
      }
      if (_defined) {
        context.logger.warning("xdmtracker already defined — overwriting previous definition")
      }
      _definition = config.events
      _defaults = config.defaults || null
      _defined = true
      // Report unknown/malformed target overlays once here rather than on every
      // track() call.
      validate_definition_targets(_definition, _targets, context.logger)
      context.logger.success(
        `Tracking definition loaded (${Object.keys(_definition).length} event keys, defaults: ${
          _defaults ? "yes" : "no"
        }, via ${source === "config" ? "plugin config" : "define()"})`
      )
      return true
    }

    /**
     * Internal tracker: resolve component state, build the XDM payload, and send
     * via alloy(), honoring the render gate. Shared by the public track() method
     * and the autoTrack listener below, so autoTrack never depends on the global
     * `acdl_helper.xdmtracker` API existing yet (no init-timing race).
     */
    function track_impl(event, send_opts) {
      if (!_defined) {
        context.logger.error("xdmtracker not defined — call define() first")
        return
      }

      // 1. Extract event name → definition lookup key
      const event_name = event?.message?.event
      if (!event_name) {
        context.logger.error("Cannot resolve event name from event.message.event")
        return
      }

      // 2. Look up definition
      const def = _definition[event_name]
      if (!def) {
        context.logger.info('No definition for event "' + event_name + '"')
        return
      }

      // 3. Extract component state via catch
      const caught = context.catch(event)
      const cmp = (caught && caught.get()) || {}

      // 4. Resolve which targets receive this event (exclusions, optIn, fetchOnly rules)
      const sends = resolve_send_targets(def, _targets, context.logger)
      if (sends.length === 0) {
        context.logger.info(`No target receives event "${event_name}"`)
        return _multi_target ? {} : undefined
      }

      // 5. Build and send one payload per target.
      const payloads = {}
      sends.forEach(({ target, overlay }) => {
        payloads[target.key] = send_to_target(event_name, def, cmp, send_opts || {}, target, overlay)
      })

      // Single implicit target → the payload itself (unchanged legacy contract).
      // Configured targets → a map keyed by target, which is what integrators debug by.
      return _multi_target ? payloads : payloads[sends[0].target.key]
    }

    /**
     * Build the payload for ONE target and send it through that target's Web SDK
     * instance, honoring that target's render gate. Returns the payload.
     */
    function send_to_target(event_name, def, cmp, send_opts, target, overlay) {
      const tag = _multi_target ? `[${target.key}] ` : ""
      const { layers, semantics } = resolve_target_def(
        event_name,
        def,
        target,
        overlay,
        _defaults,
        context.logger
      )
      // A personalization:false target must not pick up personalization from the
      // CALL-level send_opts either: build_payload falls back to send_opts whenever the
      // definition is silent, which would bypass the capability. An explicit overlay
      // still wins, because it lands in `semantics` and the definition beats send_opts.
      let effective_send_opts = send_opts
      if (!target.personalization && (send_opts.renderDecisions != null || send_opts.personalization != null)) {
        effective_send_opts = Object.assign({}, send_opts)
        delete effective_send_opts.renderDecisions
        delete effective_send_opts.personalization
      }

      const payload = build_payload(event_name, semantics, cmp, effective_send_opts, layers, context.logger)

      context.logger.info(`${tag}prepared payload`, payload)

      // Local sender: perform the alloy call, returning its promise (or undefined).
      const send = () => {
        try {
          const instance = window[target.instance]
          if (typeof instance !== "function") {
            context.logger.error(`${tag}alloy instance "${target.instance}" is not available`)
            return undefined
          }
          return instance("sendEvent", payload)
        } catch (err) {
          context.logger.error(`${tag}sendEvent failed:`, err, payload)
          return undefined
        }
      }

      // Send, honoring this target's render gate.
      const renders = payload.renderDecisions === true
      const awaits_render = !!(
        semantics.personalization && semantics.personalization.includeRenderedPropositions
      )

      if (renders) {
        // Triggers rendering — capture a settle signal so a later page view can
        // wait for it. Normalized via then(noop, noop): resolves on success OR
        // error, and prevents unhandled rejections.
        const p = send()
        _render_gates[target.key] = p && typeof p.then === "function" ? p.then(noop, noop) : null
      } else if (awaits_render && _render_gates[target.key]) {
        // Defer until the prior render settles so its rendered propositions can be
        // folded in — but never hang: a timeout fallback always fires the send.
        const gate = _render_gates[target.key]
        _render_gates[target.key] = null // one-shot
        const ms =
          semantics.gateTimeout != null
            ? semantics.gateTimeout
            : send_opts && send_opts.gateTimeout != null
            ? send_opts.gateTimeout
            : GATE_TIMEOUT_MS
        Promise.race([gate, timeout(ms)]).then(send)
      } else {
        send()
      }

      return payload
    }

    // Config-time definition: if the plugin config carries a tracking definition
    // (events and/or defaults), register it now — during provider() setup, which
    // runs synchronously as part of init_plugins, before any plugin event handler
    // is registered. This closes the init-ordering race where the page plugin's
    // setTimeout(0) page-load emit could fire before a separate define() call.
    // A later define() still overrides this (load_definition warns on overwrite).
    if (context.config && (context.config.events != null || context.config.defaults != null)) {
      load_definition({ events: context.config.events, defaults: context.config.defaults }, "config")
    }

    // autoTrack: self-register a single data-layer listener so the plugin tracks
    // every matching event itself — no external track rule, no manual listener, no
    // readiness workaround. Driven by the *internal* track_impl, so it never depends
    // on the global acdl_helper.xdmtracker API existing yet.
    //
    // IMPORTANT — registration is DEFERRED to a macrotask (setTimeout 0), NOT done
    // synchronously here. provider() runs mid-init, re-entrantly inside acdl_helper's
    // dependency-resolver ACDL dispatch (note the order of the "autoTrack enabled" vs
    // "API now available" logs). A listener registered during that active dispatch,
    // in the live AEM Core Components ACDL, only replays the queued snapshot and then
    // NEVER fires for later pushes — so the page view (page plugin's setTimeout(0)
    // page:load) and every user interaction are silently dropped, while only the
    // init-burst events get tracked. Registering AFTER init unwinds, on the now-idle
    // live data layer, makes the subscription stick for future events. This mirrors
    // the proven consumer workaround: a post-init
    //   adobeDataLayer.push(dl => dl.addEventListener("adobeDataLayer:event", h, { scope: "all" }))
    // which `context.acdl.add_event_listener` performs verbatim — so the fix is the
    // timing, not the handle. (Our standalone-ACDL Node tests across v1.1.5–v3.0.1
    // could NOT reproduce the live-drop; this encodes observed AEM behavior — see
    // DOCS/FEATURES/xdmtracker-autotrack. "Observed behavior wins.")
    //
    // scope:"all" still replays anything already queued at registration, so the early
    // prefetch / page-load are not lost even though we register slightly later.
    //
    // A raw data-layer listener event carries `event`/`eventInfo` at the top level
    // and, unlike an Adobe Launch rule event, has no `$type`. We wrap it as
    // { message, $type } so track_impl sees event.message.event/eventInfo AND the
    // core catch() (event_catcher.is_dl_event) accepts it — otherwise component
    // state would resolve empty. (Guarded on context.acdl so unit tests that build
    // the provider with a minimal context are unaffected.)
    if (context.config && context.config.autoTrack && context.acdl) {
      const auto_handler = acdl_event =>
        track_impl({ message: acdl_event, $type: "adobe-client-data-layer:event" })
      const register_auto_track = () =>
        context.acdl.add_event_listener("adobeDataLayer:event", auto_handler, { scope: "all" })
      // Defer out of the synchronous init dispatch (see note above).
      if (typeof setTimeout === "function") setTimeout(register_auto_track, 0)
      else register_auto_track()
      context.logger.success("autoTrack enabled — subscribing to data-layer events after init")
    }

    return Object.freeze({
      /**
       * Load a tracking definition with optional defaults.
       *
       * Optional when the definition is supplied via plugin config
       * (`plugins: { xdmtracker: { events, defaults } }`); calling define()
       * afterwards overrides the config-time definition.
       *
       * @param {Object} config
       * @param {Object} config.events    - Map of ACDL event names to tracking descriptors
       * @param {Object} [config.defaults] - Base variables merged into every sendEvent (eVars, props, lists, events, xdm, xdmPairs)
       */
      define(config) {
        load_definition(config, "define")
      },

      /**
       * Track an event: resolve the component state, build the XDM payload, and send via alloy().
       *
       * The event name (event.message.event) is used to look up the definition.
       * The component state is extracted automatically via catch(event).get().
       *
       * Render gate (personalization): if an event renders decisions
       * (renderDecisions:true), its alloy promise is captured. A subsequent event
       * whose definition sets personalization.includeRenderedPropositions:true is
       * deferred until that render settles (or a gateTimeout elapses), so the
       * rendered propositions can be folded into it. This is driven purely by these
       * flags — never by event names — so any project can pick its own
       * earliest-render event and its own page-view event.
       *
       * @param {Object} event          - ACDL event from Adobe Data Collection
       * @param {Object} [send_opts]    - Send options: renderDecisions, documentUnloading,
       *                                   datastreamId, data, personalization, gateTimeout
       * @returns {Object|undefined} The payload object (useful for debugging). Note: with
       *   the render gate active, the actual alloy send may happen asynchronously after return.
       */
      track(event, send_opts) {
        return track_impl(event, send_opts)
      },
    })
  }
}
