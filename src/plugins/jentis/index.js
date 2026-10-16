/**
 * jentis — bridge Adobe Client Data Layer events to JENTIS (`_jts.push`).
 *
 * Planning, decisions and the review round: DOCS/FEATURES/jentis-bridge/README.md.
 * init validates the config, then subscribes (deferred, guarded, `scope: "all"`) to every data layer event.
 * Each event gets the state AT that event from the history cursor — also when it is replayed — and goes to the
 * sender, which owns the pageview-first lifecycle; its reports go to the per-event log (lib/log.js).
 */
import { validate_config } from "./lib/validate.js"
import { create_history_cursor } from "./lib/history.js"
import { page_node } from "./lib/document.js"
import { create_sender } from "./lib/sender.js"
import { create_log } from "./lib/log.js"

export default function jentis() {
  const meta = {
    name: "jentis",
    dependencies: [],
    events: [], // no core-registered handlers — the plugin subscribes itself (deferred, guarded)
    config: {},
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      const state = { config: null, sender: null, unsubscribe: null }
      return {
        init: init(context, state),
      }
    },
  }

  function init(context, state) {
    return function () {
      const { config, problems } = validate_config(context.config, { global_prefix: global_prefix(context) })
      state.config = config
      report_problems(context.logger, problems)

      const cursor = create_history_cursor(() => window.adobeDataLayer)
      let latest_state

      state.sender = create_sender({
        config,
        core: context.helpers,
        get_jts: () => (window._jts = window._jts || []),
        get_page: () => page_node(latest_state) || page_node(current_state()),
        report: create_log(context.logger, { enabled: config.options.log }),
      })
      state.sender.start()

      state.unsubscribe = context.acdl.subscribe(
        "adobeDataLayer:event",
        function (event) {
          // Not found in the array (e.g. another script rewrote it): the current state is the best there is.
          const at_event = cursor.state_at(event) ?? current_state(this)
          latest_state = at_event ?? latest_state
          state.sender.handle(event, at_event)
        },
        { scope: "all" }
      )
    }
  }

  function current_state(dl) {
    const source = dl && typeof dl.getState === "function" ? dl : window.adobeDataLayer
    return source && typeof source.getState === "function" ? source.getState() : undefined
  }

  // The plugin's event_prefix is "<global prefix>:jentis".
  function global_prefix(context) {
    const prefix = String(context.event_prefix || "")
    return prefix.endsWith(":jentis") ? prefix.slice(0, -":jentis".length) : prefix
  }

  // Validation problems are always reported — options.log only mutes the per-event log.
  function report_problems(logger, problems) {
    for (const { level, path, message } of problems) {
      const text = `config ${path}: ${message}`
      if (level === "error") logger.error(text)
      else logger.warning(text)
    }
  }
}
