import acdl_helper from "./acdl_helper"
import events from "./lib/events"
import default_config from "./config.default"
import * as STATICS from "./lib/statics"
import utils from "./lib/utils"
import plug from "./lib/plugin_utils"
;(function () {
  utils.acdl.push({ event: "acdl_helper:loaded" })

  window.acdl_helper = async function (custom_config) {
    const EVENTS = events(custom_config?.event_prefix || default_config.event_prefix)

    let app = {
      logger: utils.logger(custom_config?.env || "development")(STATICS.LOG_PREFIX),
      EVENTS,
      config: utils.merge_configs(default_config, custom_config),
    }

    app.logger.info("Starting initialization...")

    try {
      app = await plug.load_plugins(app)
      app.logger.info(`${Object.keys(app.plugins).length} Plugins initialized ...`)
    } catch (err) {
      app.logger.error("Plugin initialization failed", err)
      app.plugins = {}
    }

    const resolve_dependencies = utils.resolve_initial_dependencies(app, (details) => {
      app.logger.success(`Resolved ${details.length} dependencies:`)
      utils.acdl.remove_event_listener(app.EVENTS.ACDL_ALL_EVENTS, resolve_dependencies)
      utils.acdl.push({
        event: app.EVENTS.ACDL_HELPER_DEPENDENCIES_RESOLVED,
      })
      window.acdl_helper = acdl_helper(app)
    })

    utils.acdl.add_event_listener(app.EVENTS.ACDL_ALL_EVENTS, resolve_dependencies)
  }
})()
