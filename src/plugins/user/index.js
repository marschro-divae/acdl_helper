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

export default function user() {
  const meta = {
    name: "user",
    dependencies: ["launch:loaded"],
    events: [],
    config: {
      adobe_org_id: "",
      tracking_server: "",
      default_name: "Anonymous",
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
    return function () {
      if (!window.adobe?.optIn) {
        context.logger.error("Cannot initialize user - adobe optIn framework is missing!")
        return
      }
      const visitor = window.Visitor.getInstance(context.config.adobe_org_id, {
        trackingServer: context.config.tracking_server,
        trackingServerSecure: context.config.tracking_server,
      })
      context.acdl.push(utils.update_object(["user", "name"], context.config.default_name))
      context.acdl.push(utils.update_object(["user", "mcid"], visitor.getMarketingCloudVisitorID()))
      context.acdl.push(utils.update_object(["user", "local_segments"], []))
    }
  }

  function handle_event(_context) {
    return function (_event) {
      // not needed
    }
  }

  function provider(context) {
    return Object.freeze({
      get(property_name) {
        const user = context.acdl.get_state("user")
        return utils.get_user_data(user, property_name)
      },

      add_segment(segment) {
        const state = context.acdl.get_state()
        const segments = state?.user?.local_segments
        if (segments) {
          context.acdl.push(utils.update_object(["user", "local_segments"], segments.concat([segment])))
        }
      },

      remove_segment(segment) {
        const state = context.acdl.get_state()
        const segments = state?.user?.local_segments
        if (segments) {
          const updated_segments = segments.map((item) => {
            return item === segment ? null : item
          })
          context.acdl.push(utils.update_object(["user", "local_segments"], updated_segments))
        }
      },

      clear_segments() {
        const state = context.acdl.get_state()
        const segments = state?.user?.local_segments
        if (segments) {
          const updated_segments = segments.map((_item) => {
            return null
          })
          context.acdl.push(utils.update_object(["user", "local_segments"], updated_segments))
        }
      },
    })
  }
}
