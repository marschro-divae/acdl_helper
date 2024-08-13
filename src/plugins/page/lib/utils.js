import test_dataLayer_object from "./test_dataLayer_object"

export default Object.freeze({
  get_page_data,
  fulfiller,
  is_valid_dependecies_item,
})

function get_page_data(page, property_name) {
  return page && property_name ? page[property_name] : page && !property_name ? page : undefined
}

function fulfiller(logger, dependencies, callback) {
  if (!Array.isArray(dependencies)) {
    return
  }
  let resolved = false
  const relevant_dependencies = []
  const last_resort = (_e) => callback()
  window.addEventListener("beforeunload", last_resort)
  return function (page) {
    return function (event) {
      if (!resolved) {
        dependencies = dependencies.filter((dependency) => {
          // the case if the dependency is just a string event name
          if (dependency === event.event) {
            relevant_dependencies.push(dependency)
            return false
          }
          // there is a dependency but its not relevant at all for this page
          if (_is_object(dependency) && !test_dataLayer_object(page, dependency.cond)) {
            return false
          }
          // the case if the dependency is a testable object
          // optinally we could test for test_dataLayer_object(page, dependency.cond, { one_of: true })
          if (
            _is_object(dependency) &&
            dependency.event === event.event &&
            test_dataLayer_object(page, dependency.cond)
          ) {
            relevant_dependencies.push(dependency)
            return false
          }
          return true
        })
        if (dependencies.length === 0) {
          window.removeEventListener("beforeunload", last_resort)
          logger.success("Resolved page dependencies", relevant_dependencies)
          resolved = true
          callback()
        }
      }
    }
  }
}

function is_valid_dependecies_item(maybe_valid) {
  if (_is_string(maybe_valid)) {
    return null
  }
  if (!_is_object(maybe_valid)) {
    return `Invalid dependency item: Not an object!`
  }
  if (!Object.hasOwn(maybe_valid, "event")) {
    return `Invalid dependency item: Missing 'event' property`
  }
  if (!Object.hasOwn(maybe_valid, "cond")) {
    return `Invalid dependency item: Missing 'cond' property`
  }
  return null
}

function _is_string(maybe_string) {
  return typeof maybe_string === "string"
}

function _is_object(maybe_object) {
  return typeof maybe_object === "object" && maybe_object !== null
}
