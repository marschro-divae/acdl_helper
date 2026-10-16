/**
 * The plugin's per-event log: sender reports → lines for the shared logger (visible with
 * `acdl_helper.setDebug(true)`).
 *
 * `enabled: false` (`options.log: false`) mutes the per-event lines. Not muted: the pageview timeout — like the
 * validation problems at init it points at a misconfiguration, not at a single event.
 */
export function create_log(logger, { enabled = true } = {}) {
  return function report(kind, details = {}) {
    if (kind === "timeout") return logger.warning(details.message)
    if (!enabled) return

    const label = event_label(details.event)
    switch (kind) {
      case "pageview":
        return logger.success(`pageview (${label})${truncated_note(details.truncated)}`, details.document)
      case "event": {
        const { group, name } = details.document
        return logger.success(`${label} → ${group} / ${name}${truncated_note(details.truncated)}`, details.document)
      }
      case "dropped":
        return logger.info(`${label} not forwarded: ${details.reason}${rules_note(details.rules)}`)
      case "held":
        return logger.info(`${label} held until the pageview`)
      case "ignored":
        return logger.info(`${label} ignored: not in events`)
      case "problems":
        for (const { key, message } of details.problems || []) logger.warning(`${label} ${key}: ${message}`)
        return
    }
  }
}

// "cmp:click component.link-1" — the reference or path identifies the node in the log.
function event_label(event) {
  const target = event?.eventInfo?.reference ?? event?.eventInfo?.path
  return target ? `${event.event} ${target}` : String(event?.event)
}

function truncated_note(keys) {
  return keys?.length ? ` (truncated: ${keys.join(", ")})` : ""
}

// no matching rule (#0 match, #1 skip)
function rules_note(rules) {
  return rules?.length ? ` (${rules.map((why, i) => `#${i} ${why}`).join(", ")})` : ""
}
