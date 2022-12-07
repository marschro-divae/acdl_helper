export default Object.freeze({
  update_object
})

function update_object (pathArr, data) {
  const obj = {}
  pathArr.reduce(function (acc, item, index, arr) {
    if (index === arr.length - 1) return (acc[item] = data)
    return (acc[item] = {})
  }, obj)
  return obj
}
