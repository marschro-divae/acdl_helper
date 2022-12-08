import setup_clickables from "./lib/setup_clickables"
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

export default function () {
  const meta = {
    name: "clickables",
    dependencies: [],
    events: [],
    config: {
      clickables: [
        { selector: "[data-cmp-clickable-link]", event_name: "cmp:link_click", delay: 200 },
        { selector: "[data-cmp-clickable-cta]", event_name: "cmp:cta_click", delay: 200 },
      ],
    },
  }

  return {
    meta: Object.freeze(meta),

    impl(context) {
      return {
        init: init(context),
      }
    },
  }

  /**
   * IMPLEMENTATION FUNCTIONS
   */

  function init(context) {
    const test = {
      selector: "string",
      event_name: "string",
      delay: "number",
    }

    const test_result = context.config.clickables.map(utils.has_typed_properties(test))

    if (!utils.all_good(test_result)) {
      context.logger.error('Invalid configuration of config "clickables', test_result)
      return function () {}
    }

    const clickable = setup_clickables(context)

    return function () {
      context.config.clickables.forEach(clickable)
      context.logger.success("Clickable elements initialized")
    }
  }
}
