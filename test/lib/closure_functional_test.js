export default function closure_functional_test(fn, tests) {
  return function () {
    return tests.map(function (test, index) {
      const outer_fn = fn(...test.closure);
      return {
        name: fn.name,
        number: index,
        test: outer_fn(...test.args),
        expected: test.assert,
        result: typeof outer_fn(...test.args) === typeof test.assert ? "SUCCEED" : "FAILED", 
      };
    });
  };
}
