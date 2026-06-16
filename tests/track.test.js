/**
 * Tests for the render→pageview auto-gate in track().
 *
 * The gate is driven purely by config flags (renderDecisions / personalization.
 * includeRenderedPropositions), never by event names — so these tests use
 * arbitrary event names to prove genericity.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import xdmtracker from "../src/plugins/xdmtracker/index.js"
import { make_logger, deferred } from "./helpers.js"

const sleep = ms => new Promise(r => setTimeout(r, ms))

/**
 * Spin up a fresh tracker provider with a controllable alloy stub.
 * `alloy_impl(cmd, payload)` decides what each sendEvent returns.
 */
function setup(alloy_impl) {
  const sent = []
  global.window = {
    alloy: (cmd, payload) => {
      sent.push(payload)
      return alloy_impl(cmd, payload)
    },
  }
  const context = {
    logger: make_logger(),
    catch: () => ({ get: () => ({}) }),
  }
  const api = xdmtracker().impl(context).provider
  const track = name => api.track({ message: { event: name } })
  return { api, track, sent }
}

const PREFETCH = { fetchOnly: true, renderDecisions: true, personalization: { sendDisplayEvent: false } }
const PAGEVIEW = { pageView: true, personalization: { includeRenderedPropositions: true } }

test("render event sends immediately and the page view waits for it", async () => {
  const render = deferred()
  const { api, track, sent } = setup((cmd, payload) =>
    payload.renderDecisions === true ? render.promise : Promise.resolve({ propositions: [] })
  )
  api.define({ events: { "site:init": PREFETCH, "page:show": PAGEVIEW } })

  track("site:init")
  assert.equal(sent.length, 1, "prefetch is sent immediately")
  assert.equal(sent[0].type, "decisioning.propositionFetch")

  track("page:show")
  assert.equal(sent.length, 1, "page view is held until render settles")

  render.resolve({ propositions: [] })
  await sleep(0)

  assert.equal(sent.length, 2, "page view fires after render settles")
  assert.deepEqual(sent[1].xdm.web.webPageDetails.pageViews, { value: 1 })
})

test("page view still fires (timeout fallback) when the render never resolves", async () => {
  const render = deferred() // intentionally never resolved
  const { api, track, sent } = setup((cmd, payload) =>
    payload.renderDecisions === true ? render.promise : Promise.resolve({ propositions: [] })
  )
  api.define({
    events: {
      "site:init": PREFETCH,
      "page:show": { ...PAGEVIEW, gateTimeout: 5 },
    },
  })

  track("site:init")
  track("page:show")
  assert.equal(sent.length, 1, "page view is held initially")

  await sleep(30) // > gateTimeout

  assert.equal(sent.length, 2, "timeout fallback sends the page view anyway")
})

test("includeRenderedPropositions with no prior render sends immediately (no gate)", () => {
  const { api, track, sent } = setup(() => Promise.resolve({ propositions: [] }))
  api.define({ events: { "page:show": PAGEVIEW } })

  track("page:show")
  assert.equal(sent.length, 1, "no gate → no deferral")
})

test("gate is one-shot: a second page view does not re-wait a consumed gate", async () => {
  const render = deferred()
  const { api, track, sent } = setup((cmd, payload) =>
    payload.renderDecisions === true ? render.promise : Promise.resolve({ propositions: [] })
  )
  api.define({ events: { "site:init": PREFETCH, "page:show": PAGEVIEW } })

  track("site:init")
  track("page:show")
  render.resolve({ propositions: [] })
  await sleep(0)
  assert.equal(sent.length, 2)

  track("page:show") // gate already consumed → immediate
  assert.equal(sent.length, 3)
})

test("a regular link event is unaffected by the gate (sends immediately)", () => {
  const { api, track, sent } = setup(() => Promise.resolve({}))
  api.define({ events: { "cmp:click": { events: ["event100"] } } })

  track("cmp:click")
  assert.equal(sent.length, 1)
  assert.equal(sent[0].type, "web.webInteraction.linkClicks")
})
