export default function (app) {
  return function (event) {
    const component_state = get_component_state(app)
    return Object.freeze({
      get: component_state(event),
      log: () => app.logger.info(`${event?.message?.event || "👻"}`, component_state(event)()),
    })
  }
}

function is_function(maybe_fn) {
  return Boolean(maybe_fn instanceof Function)
}

function is_dl_event(event) {
  return Boolean(event?.message && event?.$type && event.$type.includes("adobe-client-data-layer"))
}

function is_native_event(event) {
  return Boolean(event?.nativeEvent)
}

function is_string(value) {
  return Boolean(typeof value === "string")
}

function is_object(obj) {
  return Boolean(typeof obj === "object" && obj !== null)
}

function get_component_state(app) {
  return function (event) {
    if (!is_function(window.adobeDataLayer?.getState)) {
      app.logger.error("Datalayer funtion getState() not available or event !")
      return
    }
    if (!is_dl_event(event)) {
      is_native_event(event)
        ? app.logger.warning(`Catched native event: ${event?.$type}`)
        : app.logger.warning("Nothing to catch")
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

function get_component_data(e, resolver) {
  if (!e) return undefined
  if (
    Object.prototype.hasOwnProperty.call(e, "eventInfo") &&
    Object.prototype.hasOwnProperty.call(e.eventInfo, "path")
  ) {
    const data_layer_object = resolver(e.eventInfo.path)
    return data_layer_object !== undefined
      ? test_property(e, data_layer_object)
      : do_not_test_property(e, data_layer_object)
  }
  return function (_filter, _property) {
    return undefined
  }
}

function test_property(e, data_layer_object) {
  return function (test, property) {
    const fsProperty = is_string(test) && !property ? test : property
    const fsTest = is_object(test) ? test : undefined
    return test_dataLayer_object(data_layer_object, fsTest, { one_of: true })
      ? fsProperty
        ? enrich_with_own_properties(data_layer_object, e.eventInfo.path)[fsProperty]
        : enrich_with_own_properties(data_layer_object, e.eventInfo.path)
      : undefined
  }
}

function do_not_test_property(_e, _data_layer_object) {
  return function (_test, _property) {
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
