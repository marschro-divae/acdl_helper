export default function repo_path_to_pageId (repoPath) {
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
        if (index > 1) acc.push(item)
        return acc
      }, [])
    : undefined
  return repoArr ? repoArr.join(' : ') : 'Cannot resolve pageId!'
}
