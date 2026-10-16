import { get_path } from "./history.js"

/**
 * Snapshot an event at event time — the node and its parent as they were then (state from the history
 * cursor). Resolvers run later, when the document is built (challenge 3: an event held for the pageview still
 * sees its own state, while `h.page()` is known by then).
 */
export function take_snapshot(event, state, core_helpers) {
  const cmp = core_helpers.resolve_node(event, { get_state: (path) => get_path(state, path) })
  const parent = cmp && typeof cmp.parentId === "string" ? get_path(state, `component.${cmp.parentId}`) : undefined
  return Object.freeze({ event, cmp, parent })
}

/** The page node of a state (`page.<id>`), or `undefined`. */
export function page_node(state) {
  const pages = state && typeof state === "object" ? state.page : undefined
  if (!pages || typeof pages !== "object") return undefined
  const first = Object.values(pages)[0]
  return first && typeof first === "object" ? first : undefined
}

/**
 * Build the JENTIS event document for a snapshot.
 * Returns `{ document, truncated, rule_index, problems }` or `{ dropped, problems }` — `dropped` is the reason
 * (`no rule`, `rule false`, `no node`, `no matching rule` + `rules` (per rule `match` | `skip`), `empty group`,
 * `empty name`); `truncated` the keys cut to their limit; `problems` lists resolver errors and dropped values
 * (for the log).
 */
export function build_event_document(snapshot, config, context) {
  const problems = []
  const rules = config.events[snapshot.event?.event]
  if (rules === undefined) return { dropped: "no rule", problems }
  if (rules === false) return { dropped: "rule false", problems }
  if (!snapshot.cmp) return { dropped: "no node", problems }

  const h = helpers_for(snapshot, config, context)
  const cmp = snapshot.cmp
  const outcomes = [] // why each rule before the chosen one did not apply: "match" | "skip"
  const rule_index = rules.findIndex((rule) => {
    if (rule.match && !context.core.matches(cmp, rule.match)) {
      outcomes.push("match")
      return false
    }
    if (rule.skip && call(rule.skip, [cmp, h], "skip", problems) === true) {
      outcomes.push("skip")
      return false
    }
    return true
  })
  if (rule_index < 0) return { dropped: "no matching rule", rules: outcomes, problems }

  const rule = rules[rule_index]
  const resolve = (value, key) => resolve_value(value, [cmp, h], key, problems)

  const group = resolve(rule.group, "group")
  if (typeof group !== "string" || !group.trim()) return { dropped: "empty group", problems }
  const name = resolve(rule.name, "name")
  if (typeof name !== "string" || !name.trim()) return { dropped: "empty name", problems }

  const document = {
    ...resolve_props(config.defaults.props, [cmp, h], problems),
    ...resolve_props(rule.props, [cmp, h], problems),
    track: "event",
    group,
    name,
  }
  const value = rule.value === undefined ? cmp["dc:title"] : resolve(rule.value, "value")
  if (is_scalar(value)) document.value = value
  else if (value !== undefined) problems.push({ key: "value", message: "not a string, number or boolean — omitted" })

  if (rule.interactive !== undefined) {
    const interactive = resolve(rule.interactive, "interactive")
    if (typeof interactive === "boolean") document.interactive = interactive
    else if (interactive !== undefined) problems.push({ key: "interactive", message: "not a boolean — omitted" })
  }
  if (rule.numvalue !== undefined) {
    const numvalue = resolve(rule.numvalue, "numvalue")
    if (typeof numvalue === "number" && Number.isFinite(numvalue)) document.numvalue = numvalue
    else if (numvalue !== undefined) problems.push({ key: "numvalue", message: "not a finite number — omitted" })
  }

  return { ...truncate_document(document, config.options), rule_index, problems }
}

/** Build the JENTIS pageview document from the page node. */
export function build_pageview_document(page, config, context) {
  const problems = []
  const h = helpers_for({ event: undefined, cmp: page, parent: undefined }, config, context)
  const document = { track: "pageview", ...resolve_props(config.pageview?.props, [page, h], problems) }
  return { ...truncate_document(document, config.options), problems }
}

function helpers_for(snapshot, config, context) {
  const core = context.core
  return Object.freeze({
    event: snapshot.event,
    page: () => context.get_page(),
    parent: () => snapshot.parent,
    already_shown: (cmp = snapshot.cmp) => {
      const shown = snapshot.parent?.shownItems
      const id = cmp?.["dlh:ownId"] ?? cmp?.id
      return Array.isArray(shown) && id !== undefined && shown.includes(id)
    },
    truncate: (value, length) => truncate(value, length),
    link_type: (url) => core.link_type(url, { partner_hosts: config.partner_hosts }),
    family: (cmp_or_type) => core.family(cmp_or_type, config.families),
    matches: core.matches,
  })
}

function resolve_props(props, args, problems) {
  const out = {}
  for (const [key, spec] of Object.entries(props || {})) {
    const value = resolve_value(spec, args, key, problems)
    if (is_scalar(value)) out[key] = value
    else if (value !== undefined) problems.push({ key, message: "not a string, number or boolean — omitted" })
  }
  return out
}

function resolve_value(spec, args, key, problems) {
  return typeof spec === "function" ? call(spec, args, key, problems) : spec
}

function call(fn, args, key, problems) {
  try {
    return fn(...args)
  } catch (err) {
    problems.push({ key, message: `resolver threw: ${err?.message || err}` })
    return undefined
  }
}

// Returns { document, truncated } — truncated: the keys that were cut (for the log).
function truncate_document(document, options) {
  const out = {}
  const truncated = []
  for (const [key, value] of Object.entries(document)) {
    const reserved = key === "track" || key === "group" || key === "name"
    const limit = options?.max_lengths?.[key] ?? options?.max_value_length
    out[key] = !reserved && typeof value === "string" ? truncate(value, limit) : value
    if (out[key] !== value) truncated.push(key)
  }
  return { document: out, truncated }
}

function truncate(value, length) {
  return typeof value === "string" && Number.isInteger(length) && length > 0 && value.length > length
    ? value.slice(0, length)
    : value
}

function is_scalar(v) {
  return typeof v === "string" || typeof v === "boolean" || (typeof v === "number" && Number.isFinite(v))
}
