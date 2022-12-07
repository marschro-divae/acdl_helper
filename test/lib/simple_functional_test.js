export default function simple_functional_test(fn, tests) {
  return function () {
    return tests.map(function (test, index) {
      return {
        name: fn.name,
        number: index,
        test: fn(...test.args),
        expected: test.assert,
        result: fn(...test.args) === test.assert ? "SUCCEED" : "FAILED",
      };
    });
  };
}
