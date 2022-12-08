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

export default function page() {
  const meta = {
    name: "component",
    dependencies: [],
    events: [],
    config: {},
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      return {
        init: init(context),
        // handle_event: handle_event(context),
        provider: provider(context),
      }
    },
  }

  /**
   * IMPLEMENTATION FUNCTIONS
   */

  function init(_context) {
    return function () {
      // init here
    }
  }

  function provider(context) {
    return Object.freeze({
      get(component_reference, property_name) {
        const component = context.acdl.get_state(`component.${component_reference}`)
        return utils.get_component_data(component, property_name)
      },
    })
  }
}
