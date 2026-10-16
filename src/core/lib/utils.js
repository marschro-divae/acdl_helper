import * as STATICS from "./statics.js"

let _debug = read_debug_flag()

const acdl = gen_acdl()

export default Object.freeze({
  is_object,
  resolve_initial_dependencies,
  logger,
  set_debug,
  is_function,
  update_object,
  message,
  acdl,
  merge_configs,
})

function is_object(obj) {
  return Boolean(typeof obj === "object" && obj !== null)
}

function is_function(maybe_fn) {
  return Boolean(maybe_fn instanceof Function)
}

function message(message, prefix = STATICS.LOG_PREFIX) {
  return {
    as_info: `%c${prefix} – ${message}`,
    as_success: `%c${prefix} – ${message}`,
    as_warning: `%c${prefix} – ${message}`,
    as_error: `%c${prefix} – ${message}`,
  }
}

// Read once at module load. Accessing localStorage can throw (sandboxed iframe, storage blocked by browser
// settings) — unguarded, that aborted loading the whole library. A storage without getItem (Node 25's global)
// counts as "off" too.
function read_debug_flag() {
  try {
    return (
      typeof localStorage !== "undefined" &&
      typeof localStorage.getItem === "function" &&
      localStorage.getItem("acdl_helper_debug") === "true"
    )
  } catch (_e) {
    return false
  }
}

function set_debug(flag) {
  _debug = !!flag
  try {
    if (_debug) localStorage.setItem("acdl_helper_debug", "true")
    else localStorage.removeItem("acdl_helper_debug")
  } catch (_e) {
    /* private browsing / disabled storage */
  }
}

function logger(prefix = "[acdl_helper]") {
  return {
    info: (msg, ...args) => _debug && console.log(message(msg, prefix).as_info, "", ...args),
    success: (msg, ...args) => _debug && console.log(message(msg, prefix).as_success, "color: green", ...args),
    warning: (msg, ...args) => _debug && console.log(message(msg, prefix).as_warning, "color: orange", ...args),
    error: (msg, ...args) => _debug && console.log(message(msg, prefix).as_error, "color: red", ...args),
  }
}

// ACDL (2.0.2, verified in AEM) lets an exception in a listener escape push() to the code that pushed (Core
// collector, project data layer services, components) and skips the later listeners for that event. Every
// listener of the library is therefore registered through a guard: errors are logged, never rethrown. One
// guard per handler (a plugin may register the same handler for several events), so removal still works.
const listener_guards = new WeakMap()
const listener_logger = logger(STATICS.LOG_PREFIX)

function guarded(event, handler) {
  if (!is_function(handler)) return handler
  if (!listener_guards.has(handler)) {
    listener_guards.set(handler, function (...args) {
      try {
        return handler.apply(this, args)
      } catch (err) {
        listener_logger.error(`Listener for "${args[0]?.event || event}" threw — caught, not rethrown`, err)
        return undefined
      }
    })
  }
  return listener_guards.get(handler)
}

function gen_acdl() {
  const api = Object.freeze({
    push(data) {
      window.adobeDataLayer = window.adobeDataLayer || []
      window.adobeDataLayer.push(data)
    },

    add_event_listener(event, handler, options) {
      window.adobeDataLayer = window.adobeDataLayer || []
      const listener = guarded(event, handler)
      window.adobeDataLayer.push(function (dl) {
        dl.addEventListener(event, listener, options)
      })
    },

    remove_event_listener(event, handler) {
      window.adobeDataLayer = window.adobeDataLayer || []
      const listener = listener_guards.get(handler) || handler
      window.adobeDataLayer.push(function (dl) {
        dl.removeEventListener(event, listener)
      })
    },

    /**
     * Register a listener AFTER the current dispatch (macrotask), as xdmtracker's autoTrack does: a listener
     * registered during acdl_helper's own init dispatch was observed to stop receiving later events in live AEM
     * (DOCS/FEATURES/xdmtracker-autotrack §2a). `scope: "all"` still replays what was pushed before.
     * Guarded like every listener. Returns `unsubscribe()`, which also works before the registration ran.
     */
    subscribe(event, handler, options) {
      let state = "pending"
      const register = () => {
        if (state !== "pending") return
        state = "registered"
        api.add_event_listener(event, handler, options)
      }
      if (typeof setTimeout === "function") setTimeout(register, 0)
      else register()
      return () => {
        if (state === "registered") api.remove_event_listener(event, handler)
        state = "cancelled"
      }
    },

    get_state(reference) {
      if (!is_function(window.adobeDataLayer?.getState)) {
        throw Error(message("Adobe Client Data Layer not (yet) initialized").as_error)
      }
      return window.adobeDataLayer.getState(reference)
    },
  })
  return api
}

function execute_once(fn) {
  let done = false
  return function (...args) {
    if (!done) {
      done = true
      fn(...args)
    }
  }
}

function resolve_initial_dependencies(app, fn) {
  if (!Array.isArray(app?.config?.dependencies)) {
    throw TypeError(message("Dependencies are expected to be an array of event names").as_error)
  }

  let deps = Array.from(new Set(app.config.dependencies))
  const safe_callback = execute_once(fn)
  const resolve_data = []
  app.logger.warning(`Awaiting ${deps.length} dependencies ...`, { dependencies: deps })

  return function (obj) {
    const isDependecy = deps.find((i) => i === obj.event) ? obj : false
    if (isDependecy) {
      resolve_data.push(obj)
    }
    deps = deps.length === 0 ? deps : deps.filter((item) => item !== obj.event)
    if (deps.length === 0) {
      safe_callback(resolve_data)
    }
  }
}

function update_object(pathArr, data) {
  const obj = {}
  pathArr.reduce(function (acc, item, index, arr) {
    if (index === arr.length - 1) return (acc[item] = data)
    return (acc[item] = {})
  }, obj)
  return obj
}

function merge_configs(base, customize) {
  if (!customize) {
    return base
  }
  const all_plugins = { ...base.plugins, ...customize.plugins }
  return { ...base, ...customize, plugins: all_plugins }
}
