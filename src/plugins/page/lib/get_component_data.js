import test_dataLayer_object from "./test_dataLayer_object"

export default function get_component_data(e, resolver) {
  if (!e) return undefined
  if (
    Object.prototype.hasOwnProperty.call(e, "eventInfo") &&
    Object.prototype.hasOwnProperty.call(e.eventInfo, "path")
  ) {
    const dataLayerObject = resolver(e.eventInfo.path)
    return dataLayerObject !== undefined
      ? function (test, property) {
          const fsProperty = typeof test === "string" && !property ? test : property
          const fsTest = typeof test === "object" ? test : undefined
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
