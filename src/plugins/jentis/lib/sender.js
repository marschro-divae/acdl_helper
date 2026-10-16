import { take_snapshot, build_event_document, build_pageview_document, page_node } from "./document.js"

/**
 * Lifecycle: data layer events in, JENTIS documents out (`_jts`). Pure of globals — the plugin wires it to the
 * real data layer; tests drive it directly.
 *
 * - The pageview (`pageview.on`) is sent first, once: `{ track: "pageview", … }` + `{ track: "submit" }`.
 * - Event documents that happen before it are **held** (as snapshots — their state is fixed at event time)
 *   and sent right after the pageview. If no pageview arrives within `options.pageview_timeout`, they are sent
 *   with a warning that names the configured `pageview.on` (no silent loss when the page event is renamed or
 *   missing). A pageview arriving after that is still sent, once.
 * - `pageview: false` → no pageview, nothing is held.
 *
 * `report(kind, details)` receives every outcome — `pageview`, `event`, `dropped`, `held`, `ignored` (event not
 * in `events`), `problems` (resolver errors), `timeout`; `lib/log.js` turns them into log lines.
 */
export function create_sender({
  config,
  core,
  get_jts,
  get_page,
  schedule = setTimeout,
  cancel = clearTimeout,
  report = () => {},
}) {
  const pageview_enabled = config.pageview !== false
  let pageview_sent = false
  let timed_out = false
  let timer
  const held = []

  const context = { core, get_page }

  function push(document) {
    get_jts().push(document)
  }

  function send_event(snapshot) {
    const result = build_event_document(snapshot, config, context)
    if (result.problems.length) report("problems", { event: snapshot.event, problems: result.problems })
    if (result.document) {
      push(result.document)
      report("event", {
        event: snapshot.event,
        document: result.document,
        rule_index: result.rule_index,
        truncated: result.truncated,
      })
    } else {
      report("dropped", { event: snapshot.event, reason: result.dropped, rules: result.rules })
    }
  }

  function send_pageview(state, snapshot) {
    const page = snapshot.cmp || page_node(state)
    if (!page) {
      report("dropped", { event: snapshot.event, reason: "no page node" })
      return false
    }
    const result = build_pageview_document(page, config, context)
    if (result.problems.length) report("problems", { event: snapshot.event, problems: result.problems })
    push(result.document)
    push({ track: "submit" })
    report("pageview", { event: snapshot.event, document: result.document, truncated: result.truncated })
    return true
  }

  function flush() {
    while (held.length) send_event(held.shift())
  }

  return {
    /** Start the pageview timeout. */
    start() {
      if (!pageview_enabled) return
      timer = schedule(() => {
        if (pageview_sent) return
        timed_out = true
        report("timeout", {
          on: config.pageview.on,
          held: held.length,
          message: `no "${config.pageview.on}" within ${config.options.pageview_timeout} ms — is pageview.on the page plugin's event? Sending held events without a pageview.`,
        })
        flush()
      }, config.options.pageview_timeout)
    },

    /** Handle one data layer event with the state at that event. */
    handle(event, state) {
      const name = event?.event
      if (!name) return

      if (pageview_enabled && name === config.pageview.on) {
        if (pageview_sent) {
          report("dropped", { event, reason: "pageview already sent" })
          return
        }
        if (send_pageview(state, take_snapshot(event, state, core))) {
          pageview_sent = true
          if (timer !== undefined) cancel(timer)
          flush()
        }
        return
      }

      if (!(name in config.events)) {
        report("ignored", { event }) // not configured — not ours
        return
      }
      const snapshot = take_snapshot(event, state, core)
      if (pageview_enabled && !pageview_sent && !timed_out) {
        held.push(snapshot)
        report("held", { event })
      } else send_event(snapshot)
    },

    /** For tests / diagnostics. */
    status() {
      return { pageview_sent, timed_out, held: held.length }
    },
  }
}
