import simple_functional_test from "./lib/simple_functional_test.js";
import fn from "../lib/repo_path_to_tenant.js";

/**
 * TESTS
 */
const tests = [
  {
    args: ["/content/fraport-company-sample/en/components/embed.html"],
    assert: "Fraport Company Sample",
  },
  {
    args: ["/content/fraport-company-/en/components/embed.html"],
    assert: "Fraport Company",
  },
  {
    args: ["/content/fraport--bulgaria-base/en/components/embed.html"],
    assert: "Fraport Bulgaria Base",
  },
  {
    args: ["/content/slowenia/en/components/embed.html"],
    assert: "Slowenia",
  },
];

export const run = simple_functional_test(fn, tests);
