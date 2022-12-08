export default Object.freeze({
  get_component_data,
})

function get_component_data(user, property_name) {
  return user && property_name ? user[property_name] : user && !property_name ? user : undefined
}
