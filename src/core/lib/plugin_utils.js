import * as STATICS from "./statics"
import utils from "./utils"

export default {
  load_plugins,
  init_plugins,
  register_plugin_event_handler,
  get_all_plugin_provider,
}

/**
 * BACKGROUND
 *
 * - Plugins are loaded dynamically only if needed via web-pack chunks.
 * - All loaded and initialized plugins are then availble in `app.plugins`
 * - example how a plugin has to be implemented: see usercentrics plugin in `../plugins/usercentrics.js`
 *
 */
async function load_plugins(app) {
  if (!utils.is_object(app.config.plugins)) {
    throw TypeError(
      utils.message("Plugins are expected to be an object with key (plugin-id) and value (plugin config object)")
        .as_error
    )
  }

  const plugin_list = Object.keys(app.config.plugins)

  const { plugins, dependencies } = await Promise.all(
    plugin_list.map(async (plugin_name) => {
      try {
        const plugin_module = await import(`../../plugins/${plugin_name}/index.js`)
        const plugin = plugin_module.default()
        const maybe_custom_config_for_plugin =
          utils.is_object(app.config.plugins[plugin_name]) && app.config.plugins[plugin_name]
        plugin.config = Object.freeze({
          ...plugin.meta.config,
          ...maybe_custom_config_for_plugin,
        })
        return plugin
      } catch (err) {
        app.logger.error(`Plugin "${plugin_name}" not found!`, err)
        return
      }
    })
  )
    .then((plugins_array) => {
      return plugins_array.reduce(
        (acc, plugin) => {
          if (!plugin) return acc
          acc.plugins[plugin.meta.name] = plugin
          acc.dependencies.push(plugin.meta.dependencies)
          return acc
        },
        { plugins: {}, dependencies: [] }
      )
    })
    .catch((_err) => {
      throw Error(utils.message("Something went incredibly wrong during plugin loading...").as_error)
    })

  app.config.dependencies = app.config.dependencies.concat(dependencies.flat())
  app.plugins = plugins
  return app
}

/**
 * BACKGROUND
 *
 * - If the plugins need more context, this is a good place to handle it
 * - Currently, we provide the logger, the plugins config, an event-prefix and the acdl helper functions
 * - and a shared object space, to be useed by plugins and t make it avaiable to the greater context
 *
 */
function init_plugins(plugins, env, event_prefix) {
  Object.keys(plugins).forEach((plugin_key) => {
    // 1. Check if the plugin correctly provides the impl() function
    if (!utils.is_function(plugins[plugin_key].impl)) {
      throw Error(utils.message(`Plugin "${plugin_key}" does not implement function impl()`).as_error)
    }

    // 2. Create a context for the plugin
    const context = Object.freeze({
      logger: utils.logger(env)(`[${STATICS.LOG_PLUGIN_PREFIX}: ${plugin_key}]`),
      config: plugins[plugin_key].config,
      event_prefix: `${event_prefix}:${plugin_key}`,
      acdl: utils.acdl,
      shared: {},
    })

    // 3. Invoke the impl() function of the plugin with the context
    plugins[plugin_key].impl = plugins[plugin_key].impl(context)

    // 4. Check if the plugin implements the init() function
    if (!utils.is_function(plugins[plugin_key].impl.init)) {
      throw Error(utils.message(`Plugin "${plugin_key}" does not implement function init()`).as_error)
    }

    // 5. Call the init() function of the plugin
    plugins[plugin_key].impl.init()

    // 6. Check if the plugin provides optional provider functions. if so, invoke it with context
    if (utils.is_function(plugins[plugin_key].impl.provider)) {
      plugins[plugin_key].impl.provider = plugins[plugin_key].impl.provider(context)
    }
  })

  return plugins
}

/**
 * BACKGROUND
 *
 * Every plugin, that uses dataLayer events also has to implement a handle_event() function,
 * that processes the event (delegate to plugin)
 *
 */
function register_plugin_event_handler(app) {
  const event_handler = Object.keys(app.plugins).reduce((acc, plugin_key) => {
    const events = app.plugins[plugin_key]?.meta?.events
    const handler = app.plugins[plugin_key]?.impl?.handle_event
    const valid_events = Array.isArray(events)
    const valid_handler = utils.is_function(handler)
    if (valid_events && valid_handler) {
      events.forEach((event) => {
        utils.acdl.add_event_listener(event, handler)
      })
    }
    acc[plugin_key] = { events, handler: valid_handler ? "found" : "missing" }
    return acc
  }, {})
  app.logger.info("Registered plugin event-handlers:", { event_handler })
}

/**
 * BACKGROUND
 *
 * Providers are basically functions, implemented in plugins and provided in the
 * acdl_helper interface via name-spaced objects.
 * Namespaces are identical with the plugin names => TODO: prevent possible conflicts
 *
 */
function get_all_plugin_provider(app) {
  const plugin_list = Object.keys(app.plugins)
  return plugin_list.reduce((acc, key) => {
    if (utils.is_object(app.plugins[key]?.impl?.provider)) {
      acc[key] = app.plugins[key]?.impl?.provider
    }
    return acc
  }, {})
}
