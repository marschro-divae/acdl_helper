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

    return Object.freeze({
      /**
       * Load a tracking definition with optional defaults.
       * @param {Object} config
       * @param {Object} config.events    - Map of ACDL event names to tracking descriptors
       * @param {Object} [config.defaults] - Base variables merged into every sendEvent (eVars, props, lists, events, xdm, xdmPairs)
       */
      define(config) {
        if (!config || typeof config !== "object" || Array.isArray(config)) {
          context.logger.error("define() expects a config object: { events: {...}, defaults?: {...} }")
          return
        }
        if (!config.events || typeof config.events !== "object" || Array.isArray(config.events)) {
          context.logger.error("define() requires config.events to be an object")
          return
        }
        if (config.defaults != null && (typeof config.defaults !== "object" || Array.isArray(config.defaults))) {
          context.logger.error("config.defaults must be an object")
          return
        }
        if (_defined) {
          context.logger.warn("xdmtracker already defined — overwriting previous definition")
        }
        _definition = config.events
        _defaults = config.defaults || null
        _defined = true
        context.logger.success(
          `Tracking definition loaded (${Object.keys(_definition).length} event keys, defaults: ${_defaults ? "yes" : "no"})`
        )
      },

      /**
       * Track an event: resolve the component state, build the XDM payload, and send via alloy().
       *
       * The event name (event.message.event) is used to look up the definition.
       * The component state is extracted automatically via catch(event).get().
       *
       * @param {Object} event          - ACDL event from Adobe Data Collection
       * @param {Object} [send_opts]    - Send options: renderDecisions, documentUnloading, datastreamId, data
       * @returns {Object|undefined} The payload object (useful for debugging)
       */
      track(event, send_opts) {
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

        // 5. Send via alloy
        try {
          if (typeof window.alloy !== "function") {
            context.logger.error("alloy() is not available")
            return payload
          }
          window.alloy("sendEvent", payload)
        } catch (err) {
          context.logger.error("sendEvent failed:", err, payload)
        }
        return payload
      },
    })
  }
}
