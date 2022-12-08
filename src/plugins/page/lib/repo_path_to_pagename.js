export default function repo_path_to_pagename(repoPath) {
  return repoPath
    ? repoPath
        .split("/")
        .filter(function (item) {
          return item !== ""
        })
        .map(function (item) {
          return item.replace(".html", "")
        })
        .reduce(function (acc, item, index, arr) {
          return index === arr.length - 1 ? acc + item : acc
        }, "")
    : undefined
}
