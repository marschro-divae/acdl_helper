export default function update_path(path, data) {
  const obj = {}
  path.split(".").reduce(function (acc, item, index, arr) {
    if (index === arr.length - 1) return (acc[item] = data)
    return (acc[item] = {})
  }, obj)
  return obj
}
