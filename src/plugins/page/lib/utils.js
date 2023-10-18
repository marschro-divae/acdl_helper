export default Object.freeze({
  get_page_data,
  fulfiller,
})

function get_page_data(page, property_name) {
  return page && property_name ? page[property_name] : page && !property_name ? page : undefined
}

function fulfiller(delay_events, callback) {
  if (!Array.isArray(delay_events)) {
    return
  }
  return function (event) {
    delay_events = delay_events.filter((delay_event) => delay_event !== event.event)
    if (delay_events.length === 0) {
      callback()
    }
  }
}
