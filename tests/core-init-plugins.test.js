/**
 * Core plugin initialization (src/core/lib/plugin_utils.js → init_plugins).
 *
 * init_plugins runs inside the dependency-resolved ACDL listener (src/core/index.js → acdl_helper.js). These
 * tests lock what every plugin relies on: the context it receives, the call order, providers.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import plugin_utils from "../src/core/lib/plugin_utils.js"
import utils from "../src/core/lib/utils.js"
import { make_logger } from "./helpers.js"

/** A plugin in the shape load_plugins produces: { meta, impl, config }. Records what happens to it. */
function fake_plugin(name, { init, provider, impl } = {}) {
  const record = { name, context: null, init_calls: 0, provider_context: null }
  const plugin = {
    meta: Object.freeze({ name, dependencies: [], events: [], config: {} }),
    config: Object.freeze({ some: `${name}-config` }),
    impl:
      impl !== undefined
        ? impl
        : (context) => {
            record.context = context
            return {
              init:
                init !== undefined
                  ? init
                  : () => {
                      record.init_calls++
                    },
              provider:
                provider !== undefined
                  ? provider
                  : (ctx) => {
                      record.provider_context = ctx
                      return Object.freeze({ hello: () => `hello from ${name}` })
                    },
            }
          },
  }
  return { plugin, record }
}

const catcher = () => ({ get: () => undefined })

test("every plugin gets a frozen context: logger, own config, prefixed event_prefix, acdl, catch, shared", () => {
  const a = fake_plugin("alpha")
  const b = fake_plugin("beta")
  plugin_utils.init_plugins({ alpha: a.plugin, beta: b.plugin }, "pre", catcher)

  for (const { record } of [a, b]) {
    const ctx = record.context
    assert.ok(Object.isFrozen(ctx), "context is frozen")
    // 1.11.0 adds `helpers`; every key that existed before keeps its meaning (asserted below)
    assert.deepEqual(Object.keys(ctx).sort(), [
      "acdl",
      "catch",
      "config",
      "event_prefix",
      "helpers",
      "logger",
      "shared",
    ])
    assert.equal(ctx.event_prefix, `pre:${record.name}`)
    assert.deepEqual(ctx.config, { some: `${record.name}-config` })
    assert.equal(ctx.acdl, utils.acdl)
    assert.equal(ctx.catch, catcher)
    assert.deepEqual(ctx.shared, {})
    for (const level of ["info", "success", "warning", "error"]) assert.equal(typeof ctx.logger[level], "function")
  }
  assert.notEqual(a.record.context.shared, b.record.context.shared, "each plugin gets its own `shared` object")
})

test("every plugin gets the same frozen helpers: matches, link_type, family, resolve_node", () => {
  const a = fake_plugin("alpha")
  const b = fake_plugin("beta")
  plugin_utils.init_plugins({ alpha: a.plugin, beta: b.plugin }, "pre", catcher)
  const helpers = a.record.context.helpers
  assert.ok(Object.isFrozen(helpers))
  assert.equal(helpers, b.record.context.helpers, "one shared, immutable object")
  assert.deepEqual(Object.keys(helpers).sort(), ["family", "link_type", "matches", "resolve_node"])
  for (const fn of Object.values(helpers)) assert.equal(typeof fn, "function")
  assert.equal(helpers.link_type("mailto:x@example.com"), "mailto", "the real core functions")
})

test("init() is called once per plugin; impl() is replaced by its result", () => {
  const a = fake_plugin("alpha")
  const plugins = plugin_utils.init_plugins({ alpha: a.plugin }, "pre", catcher)
  assert.equal(a.record.init_calls, 1)
  assert.equal(typeof plugins.alpha.impl.init, "function")
})

test("a provider function is invoked with the same context and replaced by its result", () => {
  const a = fake_plugin("alpha")
  const plugins = plugin_utils.init_plugins({ alpha: a.plugin }, "pre", catcher)
  assert.equal(a.record.provider_context, a.record.context)
  assert.equal(plugins.alpha.impl.provider.hello(), "hello from alpha")
})

test("a missing provider is fine", () => {
  const a = fake_plugin("alpha", { provider: null })
  const plugins = plugin_utils.init_plugins({ alpha: a.plugin }, "pre", catcher)
  assert.equal(plugins.alpha.impl.provider, null)
})

test("get_all_plugin_provider exposes provider objects under the plugin key", () => {
  const a = fake_plugin("alpha")
  const b = fake_plugin("beta", { provider: null })
  const plugins = plugin_utils.init_plugins({ alpha: a.plugin, beta: b.plugin }, "pre", catcher)
  const providers = plugin_utils.get_all_plugin_provider({ plugins })
  assert.deepEqual(Object.keys(providers), ["alpha"])
  assert.equal(providers.alpha.hello(), "hello from alpha")
})

// ---------------------------------------------------------------------------------------------------------
// Characterization of TODAY's failure behaviour — these three are the ones phase 0 changes on purpose.
// ---------------------------------------------------------------------------------------------------------

// Before 1.11.0 each of these failures threw out of init_plugins and aborted initialization of every plugin
// (and, inside the ACDL listener, the API). Now the failing plugin is logged and removed; the rest comes up.

function isolation_case(bad_options) {
  const logger = make_logger()
  const bad = fake_plugin("bad", bad_options)
  const good = fake_plugin("good")
  const plugins = plugin_utils.init_plugins({ bad: bad.plugin, good: good.plugin }, "pre", catcher, logger)
  return { plugins, good, logger }
}

function assert_isolated({ plugins, good, logger }, reason) {
  assert.deepEqual(Object.keys(plugins), ["good"], "the failing plugin is removed, the other one stays")
  assert.equal(good.record.init_calls, 1, "the other plugin is still initialised")
  assert.equal(logger.calls.error.length, 1, "one error is logged")
  assert.match(logger.calls.error[0][0], /Plugin "bad" failed to initialize/)
  if (reason) assert.match(String(logger.calls.error[0][1]?.message), reason)
}

test("a plugin without impl() is removed; the other plugins initialise", () => {
  assert_isolated(isolation_case({ impl: null }), /does not implement function impl\(\)/)
})

test("a plugin whose impl() returns no init() is removed; the other plugins initialise", () => {
  assert_isolated(isolation_case({ init: null }), /does not implement function init\(\)/)
})

test("a throwing impl() is isolated", () => {
  assert_isolated(
    isolation_case({
      impl: () => {
        throw new Error("impl boom")
      },
    }),
    /impl boom/
  )
})

test("a throwing init() is isolated", () => {
  assert_isolated(
    isolation_case({
      init: () => {
        throw new Error("init boom")
      },
    }),
    /init boom/
  )
})

test("a throwing provider() is isolated", () => {
  assert_isolated(
    isolation_case({
      provider: () => {
        throw new Error("provider boom")
      },
    }),
    /provider boom/
  )
})

test("without an explicit logger, init_plugins still isolates (default core logger)", () => {
  const bad = fake_plugin("bad", { impl: null })
  const good = fake_plugin("good")
  const plugins = plugin_utils.init_plugins({ bad: bad.plugin, good: good.plugin }, "pre", catcher)
  assert.deepEqual(Object.keys(plugins), ["good"])
})

test("API level: acdl_helper(app) comes up with the healthy plugins when one plugin fails", async () => {
  globalThis.__VERSION__ = "test"
  globalThis.window = { adobeDataLayer: [] }
  try {
    const { default: acdl_helper } = await import("../src/core/acdl_helper.js")
    const logger = make_logger()
    const bad = fake_plugin("bad", {
      init: () => {
        throw new Error("init boom")
      },
    })
    const good = fake_plugin("good")
    const app = {
      logger,
      config: { event_prefix: "acdl_helper", dependencies: [], plugins: {} },
      plugins: { bad: bad.plugin, good: good.plugin },
    }
    const api = acdl_helper(app)
    assert.equal(api.version, "test")
    assert.equal(typeof api.setDebug, "function")
    assert.equal(typeof api.catch, "function")
    assert.equal(api.good.hello(), "hello from good", "the healthy plugin's provider is on the API")
    assert.equal(api.bad, undefined, "the failing plugin is not on the API")
    assert.equal(logger.calls.error.length, 1)
  } finally {
    delete globalThis.__VERSION__
    delete globalThis.window
  }
})
