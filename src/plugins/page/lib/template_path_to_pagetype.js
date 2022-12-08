export default function template_path_to_pagetype(templatePath) {
  return templatePath
    ? templatePath
        .split("/")
        .filter(function (item) {
          return item !== ""
        })
        .map(function (item) {
          return `${item.charAt(0).toUpperCase()}${item.slice(1)}`
        })
        .reduce(function (acc, item, index, arr) {
          return index === arr.length - 1 ? acc + item : acc
        }, "")
    : undefined
}
