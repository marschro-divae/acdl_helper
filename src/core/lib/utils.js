import * as STATICS from "./statics"

const acdl = gen_acdl()

export default Object.freeze({
  is_object,
  resolve_initial_dependencies,
  logger,
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
    as_info: `${prefix} 🦋 ${message}`,
    as_success: `${prefix} 🥦 ${message}`,
    as_warning: `${prefix} 🍋 ${message}`,
    as_error: `${prefix} 🍎 ${message}`,
  }
}

function logger(environment = "development") {
  const allow = environment === "development"
  return function (prefix = "[acdl_helper]") {
    return {
      info: (msg, ...args) => allow && console.log(message(msg, prefix).as_info, ...args),
      success: (msg, ...args) => allow && console.log(message(msg, prefix).as_success, ...args),
      warning: (msg, ...args) => allow && console.log(message(msg, prefix).as_warning, ...args),
      error: (msg, ...args) => allow && console.log(message(msg, prefix).as_error, ...args),
    }
  }
}

function gen_acdl() {
  return Object.freeze({
    push(data) {
      window.adobeDataLayer = window.adobeDataLayer || []
      window.adobeDataLayer.push(data)
    },

    add_event_listener(event, handler) {
      window.adobeDataLayer = window.adobeDataLayer || []
      window.adobeDataLayer.push(function (dl) {
        dl.addEventListener(event, handler)
      })
    },

    remove_event_listener(event, handler) {
      window.adobeDataLayer = window.adobeDataLayer || []
      window.adobeDataLayer.push(function (dl) {
        dl.removeEventListener(event, handler)
      })
    },

    get_state(reference) {
      if (!is_function(window.adobeDataLayer?.getState)) {
        throw Error(message("Adobe Client Data Layer not (yet) initialized").as_error)
      }
      return window.adobeDataLayer.getState(reference)
    },
  })
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
