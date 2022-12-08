import * as STATICS from "./statics"

const acdl = gen_acdl()

export default Object.freeze({
  is_object,
  resolve_initial_dependencies,
  logger,
  is_function,
  update_object,
  get_component_state,
  get_component_data,
  message,
  acdl,
})

function is_string(value) {
  return Boolean(typeof value === "string")
}

function is_object(obj) {
  return Boolean(typeof obj === "object" && obj !== null)
}

function is_function(maybe_fn) {
  return Boolean(maybe_fn instanceof Function)
}

function is_dl_event(event) {
  return Boolean(event?.message && event?.$type && event.$type.includes("adobe-client-data-layer"))
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

  let deps = app.config.dependencies
  const safe_callback = execute_once(fn)
  const resolve_data = []
  app.logger.warning("Waiting for dependencies ...")

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

function get_component_state(app) {
  return function (event) {
    if (!is_function(window.adobeDataLayer?.getState)) {
      app.logger.error("Datalayer funtion getState() not available or event !")
      return
    }
    if (!is_dl_event(event)) {
      app.logger.warning("Catched native event", event)
      return
    }
    app.logger.info("Catched event ", { detail: { event: event.message?.event, rule: event.$rule?.name } })

    const resolver = window.adobeDataLayer.getState
    return function (test, property) {
      const apply_test_and_filter = get_component_data(event.message, resolver)
      const data = apply_test_and_filter(test, property)
      return data
    }
  }
}

// TODO: refactor this by extracting the function in the ternary - but implement tests first!
function get_component_data(e, resolver) {
  if (!e) return undefined
  if (
    Object.prototype.hasOwnProperty.call(e, "eventInfo") &&
    Object.prototype.hasOwnProperty.call(e.eventInfo, "path")
  ) {
    const dataLayerObject = resolver(e.eventInfo.path)
    return dataLayerObject !== undefined
      ? function (test, property) {
          const fsProperty = is_string(test) && !property ? test : property
          const fsTest = is_object(test) ? test : undefined
          return test_dataLayer_object(dataLayerObject, fsTest, { one_of: true })
            ? fsProperty
              ? enrich_with_own_properties(dataLayerObject, e.eventInfo.path)[fsProperty]
              : enrich_with_own_properties(dataLayerObject, e.eventInfo.path)
            : undefined
        }
      : function (_filter, _property) {
          return undefined
        }
  }
  return function (_filter, _property) {
    return undefined
  }
}

function enrich_with_own_properties(dataLayerObject, path) {
  dataLayerObject["dlh:ownPath"] = path
  dataLayerObject["dlh:ownId"] = path.split(".")[path.split(".").length - 1]
  dataLayerObject["dlh:parentComponent"] = dataLayerObject["parentId"]
    ? beautify_parent(dataLayerObject["parentId"])
    : undefined
  return dataLayerObject
}

function beautify_parent(parentId) {
  return parentId.includes("-") ? parentId.split("-")[0] : parentId
}

function test_dataLayer_object(obj, test, option) {
  const fsTest = test || {}
  const allHaveToSucceed = !(option && option.one_of === true)
  const testResultArray = Object.keys(fsTest)
    .map(function (testProp) {
      if (is_string(obj[testProp])) {
        const match = obj[testProp].match(wildcardToRegExp(fsTest[testProp]))
        return Boolean(match)
      }
      return Boolean(Object.prototype.hasOwnProperty.call(obj, testProp) && fsTest[testProp] === obj[testProp])
    })
    .filter(function (item) {
      return item
    })
  return Object.keys(fsTest).length === 0
    ? Boolean(obj)
    : allHaveToSucceed
    ? Object.keys(fsTest).length === testResultArray.length
    : testResultArray.length > 0
}

function regexEscape(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
}

function wildcardToRegExp(s) {
  return new RegExp("^" + s.split(/\*+/).map(regexEscape).join(".*") + "$")
}
