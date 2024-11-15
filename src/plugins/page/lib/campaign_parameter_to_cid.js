export default function campaign_parameter_to_cid(cid_mapping, documentLocationSearch) {
  function filter_remove_empty(item) {
    return item !== ""
  }

  function reduce_to_utm(acc, item) {
    const tuple = item.split("=")
    if (Object.prototype.hasOwnProperty.call(acc, tuple[0])) {
      acc[tuple[0]] = tuple[1]
    }
    return acc
  }

  function map_extract_values(obj) {
    return function (item) {
      return obj[item]
    }
  }

  const query_array = documentLocationSearch.replace("?", "").split("&")
  const utm_object = query_array
    ? query_array.filter(filter_remove_empty).reduce(reduce_to_utm, cid_mapping)
    : undefined
  const cid = utm_object
    ? Object.keys(utm_object).map(map_extract_values(utm_object)).join(":").replace(/^:+$/, "")
    : ""

  return cid
}
