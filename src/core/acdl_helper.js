import plug from "./lib/plugin_utils"
import utils from "./lib/utils"

export default function acdl_helper(app) {
  app.plugins = plug.init_plugins(app.plugins, app.config.env, app.config.event_prefix)
  plug.register_plugin_event_handler(app)

  app.logger.success("acdl_helper library initialized... API now available")

  return Object.freeze({
    catch(event) {
      const component_state = utils.get_component_state(app)

      return Object.freeze({
        get: component_state(event),
        log: () => app.logger.info(`${event?.message?.event || "👻"}`, component_state(event)()),
      })
    },

    ...Object.freeze(plug.get_all_plugin_provider(app)),
  })
}
