import simple_functional_test from "./lib/simple_functional_test.js";
import fn from "../lib/repo_path_to_pageId.js";

/**
 * TESTS
 */
const tests = [
  {
    args: ["/content/company/career/de-sample/components/text.html"],
    assert: "career : de-sample : components : text",
  },
];

export const run = simple_functional_test(fn, tests);
