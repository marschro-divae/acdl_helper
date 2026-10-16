import plugin_utils from "./lib/plugin_utils.js"
import event_catcher from "./lib/event_catcher.js"
import utils from "./lib/utils.js"

export default function acdl_helper(app) {
  const catcher = event_catcher(app)
  app.plugins = plugin_utils.init_plugins(app.plugins, app.config.event_prefix, catcher, app.logger)
  plugin_utils.register_plugin_event_handler(app)

  app.logger.success("acdl_helper library initialized... API now available")

  return Object.freeze({
    // eslint-disable-next-line no-undef
    version: __VERSION__,
    setDebug: utils.set_debug,
    catch: catcher,
    ...Object.freeze(plugin_utils.get_all_plugin_provider(app)),
  })
}
