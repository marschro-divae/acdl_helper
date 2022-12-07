export default function test_dataLayer_object (obj, test, option) {
  const fsTest = test || {}
  const allHaveToSucceed = !(option && option.one_of === true)
  const testResultArray = Object.keys(fsTest)
    .map(function (testProp) {
      if (typeof obj[testProp] === 'string') {
        const match = obj[testProp].match(wildcardToRegExp(fsTest[testProp]))
        return Boolean(match)
      }
      return Boolean(Object.prototype.hasOwnProperty.call(obj, testProp) && fsTest[testProp] === obj[testProp])
    })
    .filter(function (item) {
      return item
    })
  return Object.keys(fsTest).length === 0
    ? Boolean(obj)
    : allHaveToSucceed
      ? Object.keys(fsTest).length === testResultArray.length
      : testResultArray.length > 0
}

function regexEscape (s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
}

function wildcardToRegExp (s) {
  return new RegExp('^' + s.split(/\*+/).map(regexEscape).join('.*') + '$')
}
