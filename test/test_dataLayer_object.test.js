import simple_functional_test from "./lib/simple_functional_test.js";
import fn from "../lib/test_dataLayer_object.js";
/**
 * RE-USABLE TEST DATA
 */
const testObj = Object.freeze({
  "@type": "foo/bar",
  "xml:path": true,
  "xml:tags": [],
});

const filter_noneIsValid = { "@type": "muh/mäh", "xml:path": false };
const filter_oneIsValid = { "@type": "muh/mäh", "xml:path": true };
const filter_allValid = { "@type": "foo/bar", "xml:path": true };
const filter_wildCard_found = { "@type": "*/bar" }
const filter_wildCard_not_found = { "@type": "*/baz" }

/**
 * TESTS
 */
const tests = [
  {
    args: [testObj],
    assert: true,
  },
  {
    args: [testObj, filter_oneIsValid],
    assert: false,
  },
  {
    args: [testObj, filter_oneIsValid, { one_of: true }],
    assert: true,
  },
  {
    args: [testObj, filter_allValid],
    assert: true,
  },
  {
    args: [testObj, filter_allValid, { one_of: true }],
    assert: true,
  },
  {
    args: [testObj, filter_noneIsValid, { one_of: true }],
    assert: false,
  },
  {
    args: [testObj, filter_noneIsValid, { one_of: false }],
    assert: false,
  },
  {
    args: [testObj, filter_noneIsValid, { one_of: "bar" }],
    assert: false,
  },
  {
    args: [testObj, filter_allValid],
    assert: true,
  },
  {
    args: [testObj, filter_oneIsValid],
    assert: false,
  },
  {
    args: [testObj, filter_wildCard_found],
    assert: true,
  },
  {
    args: [testObj, filter_wildCard_not_found],
    assert: false,
  },
  {
    args: [testObj, undefined],
    assert: true,
  },
  {
    args: [testObj, null],
    assert: true,
  },
];

export const run = simple_functional_test(fn, tests);
