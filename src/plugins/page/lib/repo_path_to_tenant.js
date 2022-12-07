export default function repo_path_to_tenant (repoPath) {
  const repoArr = repoPath
    ? repoPath
      .split('/')
      .filter(function (item) {
        return item !== ''
      })
      .map(function (item) {
        return item.replace('.html', '')
      })
      .reduce(function (acc, item, index) {
        if (index === 1) {
          const itemArr = item.split('-')
          const tenantName = itemArr.map(function (item){
            return `${item.charAt(0).toUpperCase()}${item.slice(1)}`
          }).filter(function (item) {
            return item
          }).join(' ')
          acc.push(tenantName)
        }
        return acc
      }, [])
    : undefined
  return repoArr ? repoArr.join(' : ') : 'Cannot resolve tenant!'
}
