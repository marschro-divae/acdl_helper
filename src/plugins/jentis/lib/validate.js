/**
 * Validate and normalise the `jentis` plugin config — run once in init(), so misconfiguration shows up when
 * the plugin starts, not when (or never) the first matching event happens.
 *
 * Pure: returns `{ config, problems }`. `problems` = `[{ level: "error" | "warning", path, message }]`, one per
 * mistake, with the config path (e.g. `events['cmp:click'][1].name`). The plugin keeps running with the valid
 * rest:
 * - a rule without a usable `group` / `name`, or with an invalid `match` / `skip` / `value` / `interactive` /
 *   `numvalue`, is skipped;
 * - an invalid property (reserved name, non-scalar static value, name over a configured limit) is dropped, the
 *   rule stays;
 * - unknown keys are warnings (typos such as `prop`).
 *
 * JENTIS is a tag manager and does not know where the data ends up. Limits of the destinations it feeds
 * (names, number of parameters, value lengths) are therefore **project configuration** — `options.max_*`,
 * all off by default — not built into the plugin.
 */

// Fields of a JENTIS event document (`_jts.push({ track: "event", group, name, value, … })`) — never props.
export const RESERVED_PROPS = Object.freeze(["track", "type", "group", "name", "value", "interactive", "numvalue"])

const TOP_LEVEL_KEYS = ["partner_hosts", "families", "options", "pageview", "defaults", "events"]
const RULE_KEYS = ["match", "skip", "group", "name", "value", "props", "interactive", "numvalue"]
const LIMIT_KEYS = ["max_value_length", "max_name_length", "max_props", "pageview_timeout"]
const OPTION_KEYS = [...LIMIT_KEYS, "max_lengths", "log"]
const DEFAULT_OPTIONS = Object.freeze({
  max_value_length: null, // no limit
  max_lengths: {},
  max_name_length: null, // no limit
  max_props: null, // no limit
  log: true,
  pageview_timeout: 5000,
})

export function validate_config(raw, { global_prefix = "acdl_helper" } = {}) {
  const problems = []
  const error = (path, message) => problems.push({ level: "error", path, message })
  const warning = (path, message) => problems.push({ level: "warning", path, message })

  const input = is_plain_object(raw) ? raw : {}
  if (raw !== undefined && !is_plain_object(raw)) error("jentis", "config must be an object")

  for (const key of Object.keys(input)) {
    if (!TOP_LEVEL_KEYS.includes(key)) warning(key, `unknown key (allowed: ${TOP_LEVEL_KEYS.join(", ")})`)
  }

  const options = validate_options(input.options, error, warning)
  const check = { error, warning, options }
  const defaults = validate_defaults(input.defaults, check)
  const config = {
    partner_hosts: validate_partner_hosts(input.partner_hosts, error, warning),
    families: validate_families(input.families, error),
    options,
    pageview: validate_pageview(input.pageview, global_prefix, check),
    defaults,
    events: validate_events(input.events, Object.keys(defaults.props).length, check),
  }
  return { config: deep_freeze(config), problems }
}

function validate_partner_hosts(value, error, warning) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    error("partner_hosts", "must be an array of host names or URLs")
    return []
  }
  return value.filter((entry, i) => {
    const ok = typeof entry === "string" && entry.trim() !== ""
    if (!ok) warning(`partner_hosts[${i}]`, "not a non-empty string — ignored")
    return ok
  })
}

function validate_families(value, error) {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    error("families", "must be an array of [pattern, family] pairs")
    return []
  }
  return value.filter((entry, i) => {
    const ok = Array.isArray(entry) && entry.length === 2 && is_text(entry[0]) && is_text(entry[1])
    if (!ok) error(`families[${i}]`, "must be a [pattern, family] pair of non-empty strings — ignored")
    return ok
  })
}

function validate_options(value, error, warning) {
  const options = { ...DEFAULT_OPTIONS, max_lengths: {} }
  if (value === undefined) return options
  if (!is_plain_object(value)) {
    error("options", "must be an object")
    return options
  }
  for (const key of Object.keys(value)) {
    if (!OPTION_KEYS.includes(key)) warning(`options.${key}`, `unknown option (allowed: ${OPTION_KEYS.join(", ")})`)
  }
  for (const key of LIMIT_KEYS) {
    if (value[key] === undefined) continue
    if (is_positive_int(value[key])) options[key] = value[key]
    else error(`options.${key}`, `must be a positive integer — ${describe_default(DEFAULT_OPTIONS[key])} used`)
  }
  if (value.log !== undefined) {
    if (typeof value.log === "boolean") options.log = value.log
    else error("options.log", "must be a boolean — default true used")
  }
  if (value.max_lengths !== undefined) {
    if (!is_plain_object(value.max_lengths)) {
      error("options.max_lengths", "must be an object of property name → positive integer")
    } else {
      for (const [prop, limit] of Object.entries(value.max_lengths)) {
        if (is_positive_int(limit)) options.max_lengths[prop] = limit
        else error(`options.max_lengths.${prop}`, "must be a positive integer — ignored")
      }
    }
  }
  return options
}

function validate_pageview(value, global_prefix, check) {
  const default_on = `${global_prefix}:page:load`
  if (value === false) return false
  if (value === undefined) return { on: default_on, props: {} }
  if (!is_plain_object(value)) {
    check.error("pageview", "must be an object or false — default used")
    return { on: default_on, props: {} }
  }
  for (const key of Object.keys(value)) {
    if (!["on", "props"].includes(key)) check.warning(`pageview.${key}`, "unknown key (allowed: on, props)")
  }
  let on = default_on
  if (value.on !== undefined) {
    if (is_text(value.on)) {
      on = value.on
      if (!on.startsWith(`${global_prefix}:`)) {
        check.warning("pageview.on", `"${on}" does not start with "${global_prefix}:" — is it the page plugin's event?`)
      }
    } else {
      check.error("pageview.on", `must be a non-empty string — default "${default_on}" used`)
    }
  }
  return { on, props: validate_props(value.props, "pageview.props", check) }
}

function validate_defaults(value, check) {
  if (value === undefined) return { props: {} }
  if (!is_plain_object(value)) {
    check.error("defaults", "must be an object")
    return { props: {} }
  }
  for (const key of Object.keys(value)) {
    if (key !== "props") check.warning(`defaults.${key}`, "unknown key (allowed: props)")
  }
  return { props: validate_props(value.props, "defaults.props", check) }
}

function validate_events(value, default_prop_count, check) {
  if (value === undefined) {
    check.warning("events", "no events configured — only the pageview is sent")
    return {}
  }
  if (!is_plain_object(value)) {
    check.error("events", "must be an object keyed by data layer event name")
    return {}
  }
  const events = {}
  for (const [event_name, entry] of Object.entries(value)) {
    const path = `events['${event_name}']`
    if (entry === false) {
      events[event_name] = false
    } else if (Array.isArray(entry)) {
      events[event_name] = entry
        .map((rule, i) => validate_rule(rule, `${path}[${i}]`, default_prop_count, check))
        .filter(Boolean)
    } else if (is_plain_object(entry)) {
      events[event_name] = [validate_rule(entry, path, default_prop_count, check)].filter(Boolean)
    } else {
      check.error(path, "must be a rule object, an array of rules or false — ignored")
    }
  }
  return events
}

function validate_rule(rule, path, default_prop_count, check) {
  const { error, warning, options } = check
  if (!is_plain_object(rule)) {
    error(path, "rule must be an object — skipped")
    return null
  }
  for (const key of Object.keys(rule)) {
    if (!RULE_KEYS.includes(key)) warning(`${path}.${key}`, `unknown rule key (allowed: ${RULE_KEYS.join(", ")})`)
  }

  let ok = true
  for (const key of ["group", "name"]) {
    if (!(is_text(rule[key]) || typeof rule[key] === "function")) {
      error(`${path}.${key}`, "required: a non-empty string or a resolver function — rule skipped")
      ok = false
    }
  }
  if (options.max_name_length && is_text(rule.name) && rule.name.length > options.max_name_length) {
    error(`${path}.name`, `"${rule.name}" exceeds options.max_name_length (${options.max_name_length}) — rule skipped`)
    ok = false
  }
  if (rule.match !== undefined) {
    const valid = is_plain_object(rule.match) && Object.values(rule.match).every((p) => typeof p === "string")
    if (!valid) {
      error(`${path}.match`, "must be an object of field → string pattern — rule skipped")
      ok = false
    }
  }
  if (rule.skip !== undefined && typeof rule.skip !== "function") {
    error(`${path}.skip`, "must be a function — rule skipped")
    ok = false
  }
  if (rule.value !== undefined && !(is_scalar(rule.value) || typeof rule.value === "function")) {
    error(`${path}.value`, "must be a string, number, boolean or resolver function — rule skipped")
    ok = false
  }
  if (
    rule.interactive !== undefined &&
    !(typeof rule.interactive === "boolean" || typeof rule.interactive === "function")
  ) {
    error(`${path}.interactive`, "must be a boolean or resolver function — rule skipped")
    ok = false
  }
  if (rule.numvalue !== undefined && !(is_finite_number(rule.numvalue) || typeof rule.numvalue === "function")) {
    error(`${path}.numvalue`, "must be a number or resolver function — rule skipped")
    ok = false
  }
  if (!ok) return null

  const props = validate_props(rule.props, `${path}.props`, check)
  if (options.max_props) {
    // group, name, value (defaults to dc:title, so always present) + optional interactive / numvalue
    // + the rule's props + the defaults' props merged into every document
    const optional_fields = ["interactive", "numvalue"].filter((k) => rule[k] !== undefined).length
    const count = 3 + optional_fields + Object.keys(props).length + default_prop_count
    if (count > options.max_props) {
      warning(path, `${count} fields exceed options.max_props (${options.max_props}) — check the destination's mapping`)
    }
  }

  const normalised = { group: rule.group, name: rule.name, props }
  for (const key of ["match", "skip", "value", "interactive", "numvalue"]) {
    if (rule[key] !== undefined) normalised[key] = rule[key]
  }
  return normalised
}

function validate_props(value, path, check) {
  const { error, options } = check
  if (value === undefined) return {}
  if (!is_plain_object(value)) {
    error(path, "must be an object of property name → value or resolver")
    return {}
  }
  const props = {}
  for (const [key, prop] of Object.entries(value)) {
    if (RESERVED_PROPS.includes(key)) {
      error(`${path}.${key}`, `"${key}" is a JENTIS document field (${RESERVED_PROPS.join(", ")}) — property dropped`)
    } else if (options.max_name_length && key.length > options.max_name_length) {
      error(`${path}.${key}`, `name exceeds options.max_name_length (${options.max_name_length}) — property dropped`)
    } else if (!(is_scalar(prop) || typeof prop === "function")) {
      error(
        `${path}.${key}`,
        "must be a string, number, boolean or resolver function (flat documents only) — property dropped"
      )
    } else {
      props[key] = prop
    }
  }
  return props
}

function describe_default(value) {
  return value === null ? "no limit" : `default ${value}`
}

function is_plain_object(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

function is_text(v) {
  return typeof v === "string" && v.trim() !== ""
}

function is_scalar(v) {
  return typeof v === "string" || typeof v === "boolean" || is_finite_number(v)
}

function is_finite_number(v) {
  return typeof v === "number" && Number.isFinite(v)
}

function is_positive_int(v) {
  return Number.isInteger(v) && v > 0
}

function deep_freeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj)
    for (const v of Object.values(obj)) if (typeof v !== "function") deep_freeze(v)
  }
  return obj
}
