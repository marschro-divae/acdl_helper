/**
 * Core logger debug flag (src/core/lib/utils.js).
 *
 * The flag is read from localStorage ONCE, when the module is evaluated. Each test therefore imports a fresh
 * module instance (query string on the specifier) after preparing `globalThis.localStorage`.
 *
 * Characterization: flag "true" → logs; flag missing → silent.
 * Robustness: storage that throws on access (sandboxed iframe, blocked storage) or a `localStorage` without
 * `getItem` (Node 25's global) must not break loading the module — the library would not start at all.
 */
import { test, afterEach } from "node:test"
import assert from "node:assert/strict"

const ORIGINAL = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
let import_counter = 0

function set_storage(descriptor) {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, ...descriptor })
}

async function fresh_utils() {
  return (await import(`../src/core/lib/utils.js?fresh=${++import_counter}`)).default
}

function capture_console(fn) {
  const calls = []
  const original = console.log
  console.log = (...args) => calls.push(args)
  try {
    fn()
  } finally {
    console.log = original
  }
  return calls
}

afterEach(() => {
  if (ORIGINAL) Object.defineProperty(globalThis, "localStorage", ORIGINAL)
  else delete globalThis.localStorage
})

test("debug flag 'true' in localStorage → logger writes", async () => {
  set_storage({ value: { getItem: (key) => (key === "acdl_helper_debug" ? "true" : null) } })
  const utils = await fresh_utils()
  const calls = capture_console(() => utils.logger("[t]").info("hello"))
  assert.equal(calls.length, 1)
})

test("debug flag missing → logger is silent", async () => {
  set_storage({ value: { getItem: () => null } })
  const utils = await fresh_utils()
  const calls = capture_console(() => utils.logger("[t]").info("hello"))
  assert.equal(calls.length, 0)
})

test("localStorage that throws on access does not break loading the module", async () => {
  set_storage({
    get() {
      throw new Error("SecurityError: The operation is insecure.")
    },
  })
  const utils = await fresh_utils()
  const calls = capture_console(() => utils.logger("[t]").info("hello"))
  assert.equal(calls.length, 0, "debug stays off")
})

test("localStorage without getItem (Node 25 global) does not break loading the module", async () => {
  set_storage({ value: {} })
  const utils = await fresh_utils()
  assert.equal(typeof utils.logger, "function")
})

test("no localStorage at all → module loads, logger silent", async () => {
  delete globalThis.localStorage
  const utils = await fresh_utils()
  const calls = capture_console(() => utils.logger("[t]").info("hello"))
  assert.equal(calls.length, 0)
})
