export default Object.freeze({
  get_page_data
})

function get_page_data (page, property_name) {
  return page && property_name
    ? page[property_name]
    : page && !property_name
      ? page
      : undefined
}
