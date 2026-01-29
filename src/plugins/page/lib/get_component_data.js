import test_dataLayer_object from "./test_dataLayer_object"

export default function get_component_data(e, resolver) {
  if (!e) return undefined

  const is_reference =
    Object.prototype.hasOwnProperty.call(e, "eventInfo") &&
    Object.prototype.hasOwnProperty.call(e.eventInfo, "reference")
  const is_path =
    Object.prototype.hasOwnProperty.call(e, "eventInfo") && Object.prototype.hasOwnProperty.call(e.eventInfo, "path")
  const resolve_info = is_reference ? e.eventInfo.reference : is_path ? e.eventInfo.path : null

  if (resolve_info) {
    const dataLayerObject = resolver(resolve_info)
    return dataLayerObject !== undefined
      ? function (test, property) {
          const fsProperty = typeof test === "string" && !property ? test : property
          const fsTest = typeof test === "object" ? test : undefined
          return test_dataLayer_object(dataLayerObject, fsTest, { one_of: true })
            ? fsProperty
              ? enrich_with_own_properties(dataLayerObject, resolve_info)[fsProperty]
              : enrich_with_own_properties(dataLayerObject, resolve_info)
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
