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

export default function usercentrics() {
  const meta = {
    name: "usercentrics",
    dependencies: ["consent_status", "launch:loaded"],
    events: ["consent_status"],
    config: {
      protocol: {
        "Adobe Analytics": "ANALYTICS",
        "Adobe Target": "TARGET",
      },
      push_after: "",
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
      const ui_language_handler = (_event) => {
        window.UC_UI.updateLanguage(document.documentElement.lang)
        window.removeEventListener("UC_UI_INITIALIZED", ui_language_handler)
      }

      if (window.UC_UI && window.UC_UI.isInitialized()) {
        window.UC_UI.updateLanguage(document.documentElement.lang)
      } else {
        window.addEventListener("UC_UI_INITIALIZED", ui_language_handler)
      }
      if (!window.adobe?.optIn) {
        context.logger.error("Adobe OptIn Framwork not available - Please install via ECID Launch Extension")
      } else {
        window.adobe.optIn.on("complete", (consent) => {
          context.logger.success("Consent updated: ", { consent })
          context.acdl.push({ event: `${context.event_prefix}:consent_applied` })
          context.acdl.push(utils.update_object(["user", "consent", "adobe"], consent))
          if (context.config.push_after) {
            context.acdl.push({ event: context.config.push_after })
          }
        })
      }
    }
  }

  function handle_event(context) {
    return function (event) {
      if (!context?.config?.protocol) {
        context.logger.warning("No custom protocol configured - using fallback protocol!")
      }

      if (!window.adobe?.optIn) {
        context.logger.error("Cannot handle event - adobe optIn framework is missing!")
        return
      }

      const protocol = context.config.protocol
      const ecid_needed = Object.keys(event).reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(protocol, key)) {
          if (event[key]) {
            window.adobe.optIn.approve(window.adobe.OptInCategories[protocol[key]], true)
            return true
          } else {
            window.adobe.optIn.deny(window.adobe.OptInCategories[protocol[key]], true)
            return acc
          }
        }
        return acc
      }, false)

      ecid_needed
        ? window.adobe.optIn.approve(window.adobe.OptInCategories["ECID"], true)
        : window.adobe.optIn.deny(window.adobe.OptInCategories["ECID"], true)
      window.adobe.optIn.complete()
    }
  }

  function provider(context) {
    return Object.freeze({
      get_active_language() {
        return window.UC_UI.getActiveLanguage()
      },

      get_base_info() {
        return window.UC_UI.getServicesBaseInfo()
      },

      async get_full_info() {
        try {
          const full_info = await window.UC_UI.getServicesFullInfo()
          return full_info
        } catch (err) {
          context.logger.error("Get full info from usercentrics failed:", err)
        }
      },
    })
  }
}
