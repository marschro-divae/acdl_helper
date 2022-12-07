/* eslint-disable @typescript-eslint/no-unused-vars */
import closure_functional_test from "./lib/closure_functional_test.js";
import fn from "../lib/get_component_data.js";

/**
 * RE-USABLE TEST DATA
 */

const invalidEvent = Object.freeze({
  message: {
    eventInfo: {
      path: "foo.bar",
    },
  },
});

const validEvent = Object.freeze({
  eventInfo: {
    path: "foo.bar",
  },
});

const allways_resolve = function (_path) {
  const testObj = {
    "@type": "foo/bar",
    "xml:path": true,
    "xml:tags": [],
    foo: "bar",
  };
  return testObj;
};

const never_resolve = function (_path) {
  return undefined;
};

const filter_noneIsValid = { "@type": "muh/mäh", "xml:path": false };
const filter_oneIsValid = { "@type": "muh/mäh", "xml:path": true };
const filter_allValid = { "@type": "foo/bar", "xml:path": true };

/**
 * TESTS
 */
const tests = [
  {
    closure: [validEvent, allways_resolve],
    args: [filter_oneIsValid, "foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, allways_resolve],
    args: [filter_noneIsValid, "foo"],
    assert: undefined,
  },
  {
    closure: [validEvent, allways_resolve],
    args: [filter_allValid, "foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, allways_resolve],
    args: [filter_allValid],
    assert: {},
  },
  {
    closure: [validEvent, allways_resolve],
    args: [filter_oneIsValid, "foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, allways_resolve],
    args: [filter_oneIsValid, "baz"],
    assert: undefined,
  },
  {
    closure: [validEvent, allways_resolve],
    args: [undefined, "foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, allways_resolve],
    args: ["foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, allways_resolve],
    args: ["baz", "foo"],
    assert: "bar",
  },
  {
    closure: [validEvent, never_resolve],
    args: ["baz"],
    assert: undefined,
  },
  {
    closure: [invalidEvent, allways_resolve],
    args: ["baz", "doo"],
    assert: undefined,
  },
  {
    closure: [invalidEvent],
    args: [],
    assert: undefined,
  },
];

export const run = closure_functional_test(fn, tests);
