/**
 * PLUGIN: xdmtracker
 *
 * Transforms declarative tracking definitions into Adobe XDM payloads
 * and sends them via alloy("sendEvent", ...).
 *
 * Usage:
 *   acdl_helper.xdmtracker.define({ events: {...}, defaults: {...} })
 *   acdl_helper.xdmtracker.track(event)
 *   acdl_helper.xdmtracker.track(event, send_opts)
 */
import { build_payload } from "./lib/payload.js"

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
      return {
        init: init(context),
        provider: provider(context),
      }
    },
  }

  function init(context) {
    return function () {
      if (typeof window.alloy !== "function") {
        context.logger.error(
          "Adobe Web SDK (alloy.js) is missing. Please install the extension via Adobe Data Collection or manually"
        )
      }
    }
  }

  function provider(context) {
    let _definition = {}
    let _defaults = null
    let _defined = false
    // Render gate: a promise that settles when the most recent renderDecisions
    // event has finished rendering. A later event asking for
    // personalization.includeRenderedPropositions waits on it (one-shot) so the
    // rendered propositions are available to fold into that single hit.
    let _render_gate = null

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

      // 4. Build payload (defaults are merged as base layer, event def overlays on top)
      const payload = build_payload(event_name, def, cmp, send_opts || {}, _defaults, context.logger)

      context.logger.info("prepared payload", payload)

      // Local sender: perform the alloy call, returning its promise (or undefined).
      const send = () => {
        try {
          if (typeof window.alloy !== "function") {
            context.logger.error("alloy() is not available")
            return undefined
          }
          return window.alloy("sendEvent", payload)
        } catch (err) {
          context.logger.error("sendEvent failed:", err, payload)
          return undefined
        }
      }

      // 5. Send via alloy, honoring the render gate.
      const renders = payload.renderDecisions === true
      const awaits_render = !!(def.personalization && def.personalization.includeRenderedPropositions)

      if (renders) {
        // Triggers rendering — capture a settle signal so a later page view can
        // wait for it. Normalized via then(noop, noop): resolves on success OR
        // error, and prevents unhandled rejections.
        const p = send()
        _render_gate = p && typeof p.then === "function" ? p.then(noop, noop) : null
      } else if (awaits_render && _render_gate) {
        // Defer until the prior render settles so its rendered propositions can be
        // folded in — but never hang: a timeout fallback always fires the send.
        const gate = _render_gate
        _render_gate = null // one-shot
        const ms =
          def.gateTimeout != null
            ? def.gateTimeout
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
