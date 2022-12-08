/**
 * GENERAL PLUGIN ARCHITECTURE
 *
 * General Hints
 * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)
 * - Implement at least init()
 * - If dataLayer events should be handled, handle_event() has to be implemented
 * - DataLayer events to listen on, have to be defined in the `events` array
 * - Config can be overwritten via remote-configuration => always address config from context
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
