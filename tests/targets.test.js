/**
 * Direct unit tests for the pure target module.
 *
 * The multi-org behavior is covered end-to-end in tests/multi-org-targets.test.js;
 * these assert the module's own contract — the shape of a normalized descriptor, the
 * routing return shape, and the guards on the exported functions — which is what the
 * plugin code relies on and what a refactor of this module must preserve.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  normalize_targets,
  resolve_send_targets,
  resolve_target_def,
  validate_definition_targets,
} from "../src/plugins/xdmtracker/lib/targets.js"
import { make_logger } from "./helpers.js"

test("normalize_targets: the implicit target descriptor (no config)", () => {
  const logger = make_logger()
  const targets = normalize_targets({}, logger)

  assert.equal(targets.length, 1)
  assert.deepEqual(targets[0], {
    key: "alloy",
    instance: "alloy",
    primary: false,
    implicit: true,
    defaults: null,
    use_global_defaults: true,
    analytics: true,
    personalization: true,
    opt_in: false,
    enabled: true,
    send_options: {},
  })
  assert.equal(logger.calls.error.length + logger.calls.warning.length, 0, "silent by default")
})

test("normalize_targets: an undefined config is treated as no targets, without an error", () => {
  const logger = make_logger()
  assert.equal(normalize_targets(undefined, logger)[0].implicit, true)
  assert.equal(normalize_targets(null, logger)[0].implicit, true)
  assert.equal(logger.calls.error.length, 0)
})

test("normalize_targets: capabilities are opt-OUT, so only an explicit false disables", () => {
  const logger = make_logger()
  const [t] = normalize_targets(
    { targets: { cja: { analytics: 0, personalization: "no", useGlobalDefaults: null } } },
    logger
  )

  // Only a strict `false` flips a capability — a truthy-but-odd value must not silently
  // disable Adobe Analytics mapping for a whole Org.
  assert.equal(t.analytics, true)
  assert.equal(t.personalization, true)
  assert.equal(t.use_global_defaults, true)
})

test("normalize_targets: only transport send options are picked up from a target", () => {
  const logger = make_logger()
  const [t] = normalize_targets(
    {
      targets: {
        cja: {
          datastreamId: "ds",
          edgeConfigOverrides: { a: 1 },
          documentUnloading: true,
          gateTimeout: 50,
          pageView: true, // semantics — must be ignored
          eventType: "x", // semantics — must be ignored
          data: { y: 1 }, // semantics — must be ignored
        },
      },
    },
    logger
  )

  assert.deepEqual(t.send_options, {
    datastreamId: "ds",
    edgeConfigOverrides: { a: 1 },
    documentUnloading: true,
    gateTimeout: 50,
  })
})

test("validate_definition_targets: guards a non-object events map", () => {
  const logger = make_logger()
  const targets = normalize_targets({}, logger)

  validate_definition_targets(undefined, targets, logger)
  validate_definition_targets("nonsense", targets, logger)
  validate_definition_targets([], targets, logger)

  assert.equal(logger.calls.warning.length, 0, "nothing to validate, nothing to say")
})

test("validate_definition_targets: skips events with no targets entry", () => {
  const logger = make_logger()
  const targets = normalize_targets({ targets: { aa: {}, cja: {} } }, logger)

  validate_definition_targets({ a: { events: ["event1"] }, b: null, c: { targets: "x" } }, targets, logger)

  assert.equal(logger.calls.warning.length, 0)
})

test("resolve_send_targets: returns a {target, overlay} pair per receiving target", () => {
  const logger = make_logger()
  const targets = normalize_targets({ targets: { aa: {}, cja: {} } }, logger)

  const all = resolve_send_targets({ events: ["event1"] }, targets, logger)
  assert.deepEqual(all.map(s => [s.target.key, s.overlay]), [["aa", null], ["cja", null]])

  const one = resolve_send_targets({ targets: { cja: false } }, targets, logger)
  assert.deepEqual(one.map(s => s.target.key), ["aa"])

  const overlay = { xdm: { a: 1 } }
  const withOverlay = resolve_send_targets({ targets: { cja: overlay } }, targets, logger)
  assert.equal(withOverlay.find(s => s.target.key === "cja").overlay, overlay, "passed through by reference")
})

test("resolve_target_def: layer order is global defaults → target defaults → def → overlay", () => {
  const logger = make_logger()
  const [, cja] = normalize_targets({ targets: { aa: {}, cja: { defaults: { props: ["T"] } } } }, logger)
  const global_defaults = { props: ["G"] }
  const def = { props: ["D"], pageView: true }
  const overlay = { props: ["O"] }

  const { layers, semantics } = resolve_target_def("e", def, cja, overlay, global_defaults, logger)

  assert.deepEqual(layers.map(l => l.props[0]), ["G", "T", "D", "O"])
  assert.equal(semantics.pageView, true)
})

test("resolve_target_def: a fetchOnly event drops BOTH defaults layers", () => {
  const logger = make_logger()
  const [t] = normalize_targets({ targets: { cja: { defaults: { props: ["T"] } } } }, logger)

  const { layers } = resolve_target_def("e", { fetchOnly: true }, t, null, { props: ["G"] }, logger)

  assert.equal(layers.length, 1, "only the event definition itself")
})
