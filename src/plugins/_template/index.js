/**
 * GENERAL PLUGIN ARCHITECTURE
 *
 * General Hints
 * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)
 * - Implement at least init()
 * - If dataLayer events should be handled, handle_event() has to be implemented
 * - DataLayer events to listen on, have to be defined in the `events` array
 * - Config can be overwritten via remote-configuration => always address config from context
 *
 * Context (impl(context))
 * - logger, config, event_prefix ("<prefix>:<plugin name>"), shared, catch
 * - acdl: push, add_event_listener, remove_event_listener, get_state, subscribe(event, handler, options)
 *   subscribe registers after the current dispatch and returns unsubscribe() — use it for an own listener
 *   instead of registering inside init() (a listener registered mid-init can miss live events)
 * - helpers (pure): matches(node, test), resolve_node(event, { get_state }), link_type(url, { partner_hosts }),
 *   family(cmp_or_type, families)
 * - every listener registered through acdl is guarded: an exception is logged, never thrown into the pusher
 * - a plugin that throws in impl() / init() is logged and disabled; the other plugins keep running
 */

export default function page() {
  const meta = {
    name: "plugin_name",
    dependencies: [],
    events: [],
    config: {},
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      return {
        init: init(context),
        handle_event: handle_event(context),
        provider: provider(context),
      }
    },
  }

  /**
   * IMPLEMENTATION FUNCTIONS
   */

  function init(_context) {
    return function () {
      return
    }
  }

  function handle_event(_context) {
    return function (_event) {
      return
    }
  }

  function provider(_context) {
    return Object.freeze({
      foo(bar) {
        return bar
      },
    })
  }
}
