import plugin_utils from "./lib/plugin_utils"
import event_catcher from "./lib/event_catcher"

export default function acdl_helper(app) {
  app.plugins = plugin_utils.init_plugins(app.plugins, app.config.env, app.config.event_prefix)
  plugin_utils.register_plugin_event_handler(app)

  app.logger.success("acdl_helper library initialized... API now available")

  return Object.freeze({
    catch: event_catcher(app),
    ...Object.freeze(plugin_utils.get_all_plugin_provider(app)),
  })
}
