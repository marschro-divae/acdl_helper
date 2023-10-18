import get_component_data from "./lib/get_component_data"
import page_builder from "./lib/page_builder"
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
    name: "page",
    dependencies: [],
    events: ["cmp:show"],
    config: {
      component_types: [
        { "@type": "*/components/page" },
        { "@type": "*/components/page/content" },
        { "@type": "*/components/page/press" },
        { "@type": "*/components/page/event" },
        { "@type": "*/components/global/integrator-page" },
        { "@type": "*/components/global/page" },
      ],
      prefix: "dlh",
      page_load_event: "load",
      delay_until: [],
    },
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

  function init(context) {
    const test_component_types_config = (to_be_tested) => {
      if (to_be_tested && !Array.isArray(to_be_tested)) {
        context.logger.error("config.component_types is an invalid configuration")
        return
      }
      to_be_tested.forEach((test) => {
        if (!Object.prototype.hasOwnProperty.call(test, "@type")) {
          context.logger.error('Missing "@type" field in configuration: ', test)
        }
      })
    }

    const test_delay_until_config = (maybe_delay_until_array) => {
      if (maybe_delay_until_array && !Array.isArray(maybe_delay_until_array)) {
        context.logger.error("config.delay_until is an invalid configuration")
      }
    }

    return function () {
      test_component_types_config(context.config?.component_types)
      test_delay_until_config(context.config?.delay_until)
    }
  }

  function handle_event(context) {
    return function (event) {
      const push_page_data = () => {
        context.acdl.remove_event_listener("adobeDataLayer:event", done)
        setTimeout(() => {
          context.logger.success(`Page resolved. Pushing "${context.config.page_load_event}" event to the dataLayer`)
          context.acdl.push({
            event: `${context.event_prefix}:${context.config.page_load_event}`,
            eventInfo: { path: context.shared.page_component },
          })
        }, 0)
      }

      const done = utils.fulfiller(context.config.delay_until, push_page_data)

      const apply_test = get_component_data(event, window.adobeDataLayer.getState)

      const testable_types = context.config.component_types
      const data = testable_types.reduce((acc, test) => {
        if (acc) return acc
        return !!apply_test(test)
      }, false)

      if (data) {
        context.shared.page_component = page_builder(event, context)
        if (context.config.delay_until.length > 0) {
          context.acdl.add_event_listener("adobeDataLayer:event", done, { scope: "all" })
        } else {
          push_page_data()
        }
      } else {
        context.logger.error("Cannot resolve page. Pagetype is unmatched. Please check or update your configuration!")
      }
    }
  }

  function provider(context) {
    return Object.freeze({
      get(property_name) {
        const page = context.acdl.get_state(context.shared.page_component)
        return utils.get_page_data(page, property_name)
      },
    })
  }
}
