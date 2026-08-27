/**
 * Unit tests for the pure path utilities.
 *
 * These are exercised indirectly through build_xdm / build_payload, but the
 * numeric-segment branch of `ensure()` is only reachable by calling it directly:
 * build_xdm only ever ensures object paths (the AA containers), while indexed
 * paths reach the XDM through set_deep_path instead.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { is_obj, parse_path, set_deep_path, ensure } from "../src/plugins/xdmtracker/lib/paths.js"

test("is_obj accepts plain objects only", () => {
  // NOTE: is_obj is `v && typeof v === "object" && !Array.isArray(v)`, so it returns a
  // TRUTHY/FALSY value rather than a strict boolean — is_obj(null) is `null`,
  // is_obj(undefined) is `undefined`. Every caller uses it in a boolean context, so
  // that is the contract asserted here.
  assert.equal(is_obj({}), true)
  assert.equal(is_obj({ a: 1 }), true)
  assert.ok(!is_obj([]))
  assert.ok(!is_obj(null))
  assert.ok(!is_obj(undefined))
  assert.ok(!is_obj("x"))
  assert.ok(!is_obj(1))
  assert.ok(!is_obj(() => {}))
})

test("parse_path splits dot and bracket notation, indices as numbers", () => {
  assert.deepEqual(parse_path("a.b[0].c"), ["a", "b", 0, "c"])
  assert.deepEqual(parse_path("productListItems[12].SKU"), ["productListItems", 12, "SKU"])
  assert.deepEqual(parse_path("single"), ["single"])
})

test("set_deep_path creates arrays for numeric segments and objects otherwise", () => {
  const obj = {}
  set_deep_path(obj, "a.b[0].c", 1)
  assert.deepEqual(obj, { a: { b: [{ c: 1 }] } })
})

test("set_deep_path replaces a non-object value standing in the way", () => {
  const obj = { a: "scalar" }
  set_deep_path(obj, "a.b", 1)
  assert.deepEqual(obj, { a: { b: 1 } })
})

test("set_deep_path accepts a pre-parsed parts array", () => {
  const obj = {}
  set_deep_path(obj, ["a", 0, "b"], "v")
  assert.deepEqual(obj, { a: [{ b: "v" }] })
})

test("ensure creates every container including the leaf and returns it", () => {
  const obj = {}
  const leaf = ensure(obj, "_experience.analytics.customDimensions.eVars")

  leaf.eVar1 = "x"
  assert.deepEqual(obj, { _experience: { analytics: { customDimensions: { eVars: { eVar1: "x" } } } } })
})

test("ensure builds an array when the next segment is an index", () => {
  const obj = {}
  const leaf = ensure(obj, "productListItems[0]")

  leaf.SKU = "abc"
  assert.ok(Array.isArray(obj.productListItems))
  assert.deepEqual(obj, { productListItems: [{ SKU: "abc" }] })
})

test("ensure keeps an existing array/object rather than recreating it", () => {
  const obj = { productListItems: [{ SKU: "kept" }] }
  ensure(obj, "productListItems[0]")

  assert.deepEqual(obj, { productListItems: [{ SKU: "kept" }] }, "existing entries survive")
})
