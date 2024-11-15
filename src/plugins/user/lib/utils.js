export default Object.freeze({
  update_object,
  get_user_data,
})

function update_object(pathArr, data) {
  const obj = {}
  pathArr.reduce(function (acc, item, index, arr) {
    if (index === arr.length - 1) return (acc[item] = data)
    return (acc[item] = {})
  }, obj)
  return obj
}

function get_user_data(user, property_name) {
  return user && property_name ? user[property_name] : user && !property_name ? user : undefined
}
