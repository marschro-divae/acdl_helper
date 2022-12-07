export default Object.freeze({
  has_typed_properties,
  all_good
})

function has_typed_properties (test) {
  return function (obj_to_be_tested) {
    const missings = Object.keys(test).reduce((acc, prop_name) => {
      if (!has_prop(obj_to_be_tested, prop_name)) {
        acc.push({ error: `Expect property "${prop_name}"` })
        return acc
      }
      if (!is_type(test[prop_name], obj_to_be_tested[prop_name])) {
        acc.push({ error: `Expect type <${test[prop_name]}> in property ${prop_name}` })
      }
      return acc
    }, [])
    return missings.length > 0 ? missings : true
  }
}

function is_string (maybe_string) {
  return typeof maybe_string === 'string'
}

function is_number (maybe_number) {
  return Number.isFinite(maybe_number)
}

function has_prop (obj, prop_name) {
  return Object.prototype.hasOwnProperty.call(obj, prop_name)
}

function is_type (type, value) {
  const match = {
    'string': is_string,
    'number': is_number
  }
  return match[type](value)
}

function all_good (maybe_array) {
  if (!Array.isArray(maybe_array)) {
    return false
  }
  return maybe_array.reduce((acc, item) => {
    if (item !== true) return false
    return acc
  }, true)
}
