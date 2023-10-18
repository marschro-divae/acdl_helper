import utils from "./lib/utils"

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

export default function cleanup() {
  const meta = {
    name: "cleanup",
    dependencies: [],
    events: ["acdl_helper:cleanup"],
    config: {
      keep: [],
    },
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      return {
        init: init(context),
        handle_event: handle_event(context),
      }
    },
  }

  /**
   * IMPLEMENTATION FUNCTIONS
   */

  function init(_context) {
    return function () {
      // nothing needed
    }
  }

  function handle_event(context) {
    return function (_event) {
      const state = context.acdl.get_state()
      const result = Object.keys(state).filter((item) => {
        return !context.config.keep.includes(item)
      })

      result.forEach((item) => {
        context.acdl.push(utils.update_object([item], null))
      })
      context.logger.info("DataLayer clean up ... done.")
    }
  }
}
