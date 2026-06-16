/**
 * Shared test helpers.
 *
 * NOTE: tests live in `tests/` (not `test/`, which is gitignored) so they are
 * tracked in version control.
 */

/**
 * A logger stub that records every call so tests can assert on warnings/errors.
 * Mirrors the plugin context logger surface: error / warning / info / success.
 */
export function make_logger() {
  const calls = { error: [], warning: [], info: [], success: [] }
  return {
    error: (...a) => calls.error.push(a),
    warning: (...a) => calls.warning.push(a),
    info: (...a) => calls.info.push(a),
    success: (...a) => calls.success.push(a),
    calls,
  }
}

/** A deferred promise: { promise, resolve, reject } — handy for gating tests. */
export function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
