/**
 * Characterization tests for resolve() — value/function resolution + error safety.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { resolve } from "../src/plugins/xdmtracker/lib/resolve.js"
import { make_logger } from "./helpers.js"

test("non-function values pass through unchanged", () => {
  const log = make_logger()
  assert.equal(resolve("hello", {}, log), "hello")
  assert.equal(resolve(42, {}, log), 42)
  assert.equal(resolve(null, {}, log), null)
})

test("function values are called with the component state", () => {
  const log = make_logger()
  assert.equal(resolve(cmp => cmp.title, { title: "Home" }, log), "Home")
})

test("a throwing resolver returns undefined and logs an error", () => {
  const log = make_logger()
  const out = resolve(() => {
    throw new Error("boom")
  }, {}, log)

  assert.equal(out, undefined)
  assert.equal(log.calls.error.length, 1)
})
