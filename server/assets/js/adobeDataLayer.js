if (!Element.prototype.matches)
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector
if (!Element.prototype.closest)
  Element.prototype.closest = function (s) {
    var el = this
    if (!document.documentElement.contains(el)) return null
    do {
      if (el.matches(s)) return el
      el = el.parentElement || el.parentNode
    } while (el !== null && el.nodeType === 1)
    return null
  }
if (!Array.prototype.find)
  Object.defineProperty(Array.prototype, "find", {
    value: function (predicate) {
      if (this == null) throw TypeError('"this" is null or not defined')
      var o = Object(this)
      var len = o.length >>> 0
      if (typeof predicate !== "function") throw TypeError("predicate must be a function")
      var thisArg = arguments[1]
      var k = 0
      while (k < len) {
        var kValue = o[k]
        if (predicate.call(thisArg, kValue, k, o)) return kValue
        k++
      }
      return undefined
    },
    configurable: true,
    writable: true,
  })
;("use strict")
function _slicedToArray(t, e) {
  return _arrayWithHoles(t) || _iterableToArrayLimit(t, e) || _unsupportedIterableToArray(t, e) || _nonIterableRest()
}
function _nonIterableRest() {
  throw new TypeError(
    "Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
  )
}
function _iterableToArrayLimit(t, e) {
  if ("undefined" != typeof Symbol && Symbol.iterator in Object(t)) {
    var n = [],
      r = !0,
      o = !1,
      a = void 0
    try {
      for (
        var i, u = t[Symbol.iterator]();
        !(r = (i = u.next()).done) && (n.push(i.value), !e || n.length !== e);
        r = !0
      );
    } catch (t) {
      ;(o = !0), (a = t)
    } finally {
      try {
        r || null == u.return || u.return()
      } finally {
        if (o) throw a
      }
    }
    return n
  }
}
function _arrayWithHoles(t) {
  if (Array.isArray(t)) return t
}
function _createForOfIteratorHelper(t) {
  if ("undefined" == typeof Symbol || null == t[Symbol.iterator]) {
    if (Array.isArray(t) || (t = _unsupportedIterableToArray(t))) {
      var e = 0,
        n = function () {}
      return {
        s: n,
        n: function () {
          return e >= t.length ? { done: !0 } : { done: !1, value: t[e++] }
        },
        e: function (t) {
          throw t
        },
        f: n,
      }
    }
    throw new TypeError(
      "Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."
    )
  }
  var r,
    o,
    a = !0,
    i = !1
  return {
    s: function () {
      r = t[Symbol.iterator]()
    },
    n: function () {
      var t = r.next()
      return (a = t.done), t
    },
    e: function (t) {
      ;(i = !0), (o = t)
    },
    f: function () {
      try {
        a || null == r.return || r.return()
      } finally {
        if (i) throw o
      }
    },
  }
}
function _unsupportedIterableToArray(t, e) {
  if (t) {
    if ("string" == typeof t) return _arrayLikeToArray(t, e)
    var n = Object.prototype.toString.call(t).slice(8, -1)
    return (
      "Object" === n && t.constructor && (n = t.constructor.name),
      "Map" === n || "Set" === n
        ? Array.from(n)
        : "Arguments" === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
        ? _arrayLikeToArray(t, e)
        : void 0
    )
  }
}
function _arrayLikeToArray(t, e) {
  ;(null == e || e > t.length) && (e = t.length)
  for (var n = 0, r = new Array(e); n < e; n++) r[n] = t[n]
  return r
}
function _typeof(t) {
  return (_typeof =
    "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
      ? function (t) {
          return typeof t
        }
      : function (t) {
          return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype
            ? "symbol"
            : typeof t
        })(t)
}
!(function a(i, u, c) {
  function f(e, t) {
    if (!u[e]) {
      if (!i[e]) {
        var n = "function" == typeof require && require
        if (!t && n) return n(e, !0)
        if (s) return s(e, !0)
        var r = new Error("Cannot find module '" + e + "'")
        throw ((r.code = "MODULE_NOT_FOUND"), r)
      }
      var o = (u[e] = { exports: {} })
      i[e][0].call(
        o.exports,
        function (t) {
          return f(i[e][1][t] || t)
        },
        o,
        o.exports,
        a,
        i,
        u,
        c
      )
    }
    return u[e].exports
  }
  for (var s = "function" == typeof require && require, t = 0; t < c.length; t++) f(c[t])
  return f
})(
  {
    1: [
      function (t, wn, En) {
        ;(function (On) {
          ;(function () {
            function n(t, e) {
              for (var n = -1, r = null == t ? 0 : t.length, o = 0, a = []; ++n < r; ) {
                var i = t[n]
                e(i, n, t) && (a[o++] = i)
              }
              return a
            }
            function a(t, e) {
              for (var n = -1, r = null == t ? 0 : t.length, o = Array(r); ++n < r; ) o[n] = e(t[n], n, t)
              return o
            }
            function f(t, e) {
              for (var n = -1, r = e.length, o = t.length; ++n < r; ) t[o + n] = e[n]
              return t
            }
            function b(t, e) {
              for (var n = -1, r = null == t ? 0 : t.length; ++n < r; ) if (e(t[n], n, t)) return !0
              return !1
            }
            function o(t, e, n) {
              var r = t.length
              for (n += -1; ++n < r; ) if (e(t[n], n, t)) return n
              return -1
            }
            function i(t) {
              return t != t
            }
            function t(e) {
              return function (t) {
                return e(t)
              }
            }
            function h(t) {
              var n = -1,
                r = Array(t.size)
              return (
                t.forEach(function (t, e) {
                  r[++n] = [e, t]
                }),
                r
              )
            }
            function e(e) {
              var n = Object
              return function (t) {
                return e(n(t))
              }
            }
            function v(t) {
              var e = -1,
                n = Array(t.size)
              return (
                t.forEach(function (t) {
                  n[++e] = t
                }),
                n
              )
            }
            function r() {}
            function u(t) {
              var e = -1,
                n = null == t ? 0 : t.length
              for (this.clear(); ++e < n; ) {
                var r = t[e]
                this.set(r[0], r[1])
              }
            }
            function c(t) {
              var e = -1,
                n = null == t ? 0 : t.length
              for (this.clear(); ++e < n; ) {
                var r = t[e]
                this.set(r[0], r[1])
              }
            }
            function s(t) {
              var e = -1,
                n = null == t ? 0 : t.length
              for (this.clear(); ++e < n; ) {
                var r = t[e]
                this.set(r[0], r[1])
              }
            }
            function d(t) {
              var e = -1,
                n = null == t ? 0 : t.length
              for (this.__data__ = new s(); ++e < n; ) this.add(t[e])
            }
            function g(t) {
              this.size = (this.__data__ = new c(t)).size
            }
            function l(t, e) {
              var n = hn(t),
                r = !n && bn(t),
                o = !n && !r && vn(t),
                a = !n && !r && !o && _n(t)
              if ((n = n || r || o || a)) {
                r = t.length
                for (var i = String, u = -1, c = Array(r); ++u < r; ) c[u] = i(u)
                r = c
              } else r = []
              var f
              i = r.length
              for (f in t)
                (!e && !be.call(t, f)) ||
                  (n &&
                    ("length" == f ||
                      (o && ("offset" == f || "parent" == f)) ||
                      (a && ("buffer" == f || "byteLength" == f || "byteOffset" == f)) ||
                      Q(f, i))) ||
                  r.push(f)
              return r
            }
            function _(t, e, n) {
              ;((n === Mt || ft(t[e], n)) && (n !== Mt || e in t)) || j(t, e, n)
            }
            function y(t, e, n) {
              var r = t[e]
              ;(be.call(t, e) && ft(r, n) && (n !== Mt || e in t)) || j(t, e, n)
            }
            function p(t, e) {
              for (var n = t.length; n--; ) if (ft(t[n][0], e)) return n
              return -1
            }
            function j(t, e, n) {
              "__proto__" == e && xe
                ? xe(t, e, { configurable: !0, enumerable: !0, value: n, writable: !0 })
                : (t[e] = n)
            }
            function m(n, r, o, t, e, a) {
              var i,
                u = 1 & r,
                c = 2 & r,
                f = 4 & r
              if ((o && (i = e ? o(n, t, e, a) : o(n)), i !== Mt)) return i
              if (!bt(n)) return n
              if ((t = hn(n))) {
                if (
                  ((i = (function (t) {
                    var e = t.length,
                      n = new t.constructor(e)
                    return (
                      e && "string" == typeof t[0] && be.call(t, "index") && ((n.index = t.index), (n.input = t.input)),
                      n
                    )
                  })(n)),
                  !u)
                )
                  return U(n, i)
              } else {
                var s = nn(n),
                  l = "[object Function]" == s || "[object GeneratorFunction]" == s
                if (vn(n)) return M(n, u)
                if ("[object Object]" == s || "[object Arguments]" == s || (l && !e)) {
                  if (((i = c || l ? {} : Y(n)), !u))
                    return c
                      ? (function (t, e) {
                          return P(t, en(t), e)
                        })(
                          n,
                          (function (t, e) {
                            return t && P(e, St(e), t)
                          })(i, n)
                        )
                      : (function (t, e) {
                          return P(t, tn(t), e)
                        })(
                          n,
                          (function (t, e) {
                            return t && P(e, Lt(e), t)
                          })(i, n)
                        )
                } else {
                  if (!Kt[s]) return e ? n : {}
                  i = (function (t, e, n) {
                    var r = t.constructor
                    switch (e) {
                      case "[object ArrayBuffer]":
                        return z(t)
                      case "[object Boolean]":
                      case "[object Date]":
                        return new r(+t)
                      case "[object DataView]":
                        return (e = n ? z(t.buffer) : t.buffer), new t.constructor(e, t.byteOffset, t.byteLength)
                      case "[object Float32Array]":
                      case "[object Float64Array]":
                      case "[object Int8Array]":
                      case "[object Int16Array]":
                      case "[object Int32Array]":
                      case "[object Uint8Array]":
                      case "[object Uint8ClampedArray]":
                      case "[object Uint16Array]":
                      case "[object Uint32Array]":
                        return C(t, n)
                      case "[object Map]":
                        return new r()
                      case "[object Number]":
                      case "[object String]":
                        return new r(t)
                      case "[object RegExp]":
                        return ((e = new t.constructor(t.source, Ht.exec(t))).lastIndex = t.lastIndex), e
                      case "[object Set]":
                        return new r()
                      case "[object Symbol]":
                        return qe ? Object(qe.call(t)) : {}
                    }
                  })(n, s, u)
                }
              }
              if ((e = (a = a || new g()).get(n))) return e
              if ((a.set(n, i), gn(n)))
                return (
                  n.forEach(function (t) {
                    i.add(m(t, r, o, t, n, a))
                  }),
                  i
                )
              if (dn(n))
                return (
                  n.forEach(function (t, e) {
                    i.set(e, m(t, r, o, e, n, a))
                  }),
                  i
                )
              c = f ? (c ? B : H) : c ? St : Lt
              var p = t ? Mt : c(n)
              return (
                (function (t, e) {
                  for (var n = -1, r = null == t ? 0 : t.length; ++n < r && !1 !== e(t[n], n, t); );
                })(p || n, function (t, e) {
                  p && (t = n[(e = t)]), y(i, e, m(t, r, o, e, n, a))
                }),
                i
              )
            }
            function A(t, e) {
              for (var n = 0, r = (e = F(e, t)).length; null != t && n < r; ) t = t[nt(e[n++])]
              return n && n == r ? t : Mt
            }
            function O(t, e, n) {
              return (e = e(t)), hn(t) ? e : f(e, n(t))
            }
            function w(t) {
              if (null == t) t = t === Mt ? "[object Undefined]" : "[object Null]"
              else if (Te && Te in Object(t)) {
                var e = be.call(t, Te),
                  n = t[Te]
                try {
                  t[Te] = Mt
                  var r = !0
                } catch (t) {}
                var o = ve.call(t)
                r && (e ? (t[Te] = n) : delete t[Te]), (t = o)
              } else t = ve.call(t)
              return t
            }
            function E(t, e) {
              return null != t && be.call(t, e)
            }
            function L(t, e) {
              return null != t && e in Object(t)
            }
            function S(t) {
              return ht(t) && "[object Arguments]" == w(t)
            }
            function T(t, e, n, r, o) {
              if (t === e) e = !0
              else if (null == t || null == e || (!ht(t) && !ht(e))) e = t != t && e != e
              else
                t: {
                  var a,
                    i,
                    u = hn(t),
                    c = hn(e),
                    f =
                      "[object Object]" ==
                      (a = "[object Arguments]" == (a = u ? "[object Array]" : nn(t)) ? "[object Object]" : a)
                  c =
                    "[object Object]" ==
                    (i = "[object Arguments]" == (i = c ? "[object Array]" : nn(e)) ? "[object Object]" : i)
                  if ((i = a == i) && vn(t)) {
                    if (!vn(e)) {
                      e = !1
                      break t
                    }
                    f = !(u = !0)
                  }
                  if (i && !f)
                    (o = o || new g()),
                      (e =
                        u || _n(t)
                          ? V(t, e, n, r, T, o)
                          : (function (t, e, n, r, o, a, i) {
                              switch (n) {
                                case "[object DataView]":
                                  if (t.byteLength != e.byteLength || t.byteOffset != e.byteOffset) break
                                  ;(t = t.buffer), (e = e.buffer)
                                case "[object ArrayBuffer]":
                                  if (t.byteLength != e.byteLength || !a(new me(t), new me(e))) break
                                  return !0
                                case "[object Boolean]":
                                case "[object Date]":
                                case "[object Number]":
                                  return ft(+t, +e)
                                case "[object Error]":
                                  return t.name == e.name && t.message == e.message
                                case "[object RegExp]":
                                case "[object String]":
                                  return t == e + ""
                                case "[object Map]":
                                  var u = h
                                case "[object Set]":
                                  if (((u = u || v), t.size != e.size && !(1 & r))) break
                                  return (n = i.get(t))
                                    ? n == e
                                    : ((r |= 2), i.set(t, e), (e = V(u(t), u(e), r, o, a, i)), i.delete(t), e)
                                case "[object Symbol]":
                                  if (qe) return qe.call(t) == qe.call(e)
                              }
                              return !1
                            })(t, e, a, n, r, T, o))
                  else {
                    if (
                      !(1 & n) &&
                      ((u = f && be.call(t, "__wrapped__")), (a = c && be.call(e, "__wrapped__")), u || a)
                    ) {
                      e = T((t = u ? t.value() : t), (e = a ? e.value() : e), n, r, (o = o || new g()))
                      break t
                    }
                    if (i)
                      e: if (
                        ((o = o || new g()), (u = 1 & n), (a = H(t)), (c = a.length), (i = H(e).length), c == i || u)
                      ) {
                        for (f = c; f--; ) {
                          var s = a[f]
                          if (!(u ? s in e : be.call(e, s))) {
                            e = !1
                            break e
                          }
                        }
                        if ((i = o.get(t)) && o.get(e)) e = i == e
                        else {
                          ;(i = !0), o.set(t, e), o.set(e, t)
                          for (var l = u; ++f < c; ) {
                            var p = t[(s = a[f])],
                              y = e[s]
                            if (r) var b = u ? r(y, p, s, e, t, o) : r(p, y, s, t, e, o)
                            if (b === Mt ? p !== y && !T(p, y, n, r, o) : !b) {
                              i = !1
                              break
                            }
                            l = l || "constructor" == s
                          }
                          i &&
                            !l &&
                            (n = t.constructor) != (r = e.constructor) &&
                            "constructor" in t &&
                            "constructor" in e &&
                            !("function" == typeof n && n instanceof n && "function" == typeof r && r instanceof r) &&
                            (i = !1),
                            o.delete(t),
                            o.delete(e),
                            (e = i)
                        }
                      } else e = !1
                    else e = !1
                  }
                }
              return e
            }
            function x(t) {
              return "function" == typeof t
                ? t
                : null == t
                ? It
                : "object" == _typeof(t)
                ? hn(t)
                  ? (function (n, r) {
                      return X(n) && r == r && !bt(r)
                        ? tt(nt(n), r)
                        : function (t) {
                            var e = wt(t, n)
                            return e === Mt && e === r ? Et(t, n) : T(r, e, 3)
                          }
                    })(t[0], t[1])
                  : (function (e) {
                      var n = (function (t) {
                        for (var e = Lt(t), n = e.length; n--; ) {
                          var r = e[n],
                            o = t[r]
                          e[n] = [r, o, o == o && !bt(o)]
                        }
                        return e
                      })(e)
                      return 1 == n.length && n[0][2]
                        ? tt(n[0][0], n[0][1])
                        : function (t) {
                            return (
                              t === e ||
                              (function (t, e) {
                                var n = e.length,
                                  r = n
                                if (null == t) return !r
                                for (t = Object(t); n--; )
                                  if ((o = e[n])[2] ? o[1] !== t[o[0]] : !(o[0] in t)) return !1
                                for (; ++n < r; ) {
                                  var o,
                                    a = (o = e[n])[0],
                                    i = t[a],
                                    u = o[1]
                                  if (o[2]) {
                                    if (i === Mt && !(a in t)) return !1
                                  } else if (((o = new g()), void 0 !== Mt || !T(u, i, 3, void 0, o))) return !1
                                }
                                return !0
                              })(t, n)
                            )
                          }
                    })(t)
                : Nt(t)
            }
            function I(t) {
              if (!Z(t)) return Ne(t)
              var e,
                n = []
              for (e in Object(t)) be.call(t, e) && "constructor" != e && n.push(e)
              return n
            }
            function k(s, l, p, y, b) {
              s !== l &&
                Xe(
                  l,
                  function (t, e) {
                    if (bt(t)) {
                      var n = (b = b || new g()),
                        r = "__proto__" == e ? Mt : s[e],
                        o = "__proto__" == e ? Mt : l[e]
                      if ((f = n.get(o))) _(s, e, f)
                      else {
                        var a = (f = y ? y(r, o, e + "", s, l, n) : Mt) === Mt
                        if (a) {
                          var i = hn(o),
                            u = !i && vn(o),
                            c = !i && !u && _n(o),
                            f = o
                          i || u || c
                            ? (f = hn(r) ? r : lt(r) ? U(r) : u ? M(o, !(a = !1)) : c ? C(o, !(a = !1)) : [])
                            : vt(o) || bn(o)
                            ? bn((f = r))
                              ? (f = At(r))
                              : (!bt(r) || (p && pt(r))) && (f = Y(o))
                            : (a = !1)
                        }
                        a && (n.set(o, f), k(f, o, p, y, n), n.delete(o)), _(s, e, f)
                      }
                    } else
                      (n = y ? y("__proto__" == e ? Mt : s[e], t, e + "", s, l, b) : Mt) === Mt && (n = t), _(s, e, n)
                  },
                  St
                )
            }
            function N(t) {
              if ("string" == typeof t) return t
              if (hn(t)) return a(t, N) + ""
              if (gt(t)) return Je ? Je.call(t) : ""
              var e = t + ""
              return "0" == e && 1 / t == -zt ? "-0" : e
            }
            function D(t, e) {
              var n
              if ((e = F(e, t)).length < 2) n = t
              else {
                var r = 0,
                  o = -1,
                  a = -1,
                  i = (n = e).length
                for (
                  r < 0 && (r = i < -r ? 0 : i + r),
                    (o = i < o ? i : o) < 0 && (o += i),
                    i = o < r ? 0 : (o - r) >>> 0,
                    r >>>= 0,
                    o = Array(i);
                  ++a < i;

                )
                  o[a] = n[a + r]
                n = A(t, o)
              }
              null == (t = n) || delete t[nt(it(e))]
            }
            function F(t, e) {
              return hn(t) ? t : X(t, e) ? [t] : ln(Ot(t))
            }
            function M(t, e) {
              if (e) return t.slice()
              var n = t.length
              n = Ae ? Ae(n) : new t.constructor(n)
              return t.copy(n), n
            }
            function z(t) {
              var e = new t.constructor(t.byteLength)
              return new me(e).set(new me(t)), e
            }
            function C(t, e) {
              return new t.constructor(e ? z(t.buffer) : t.buffer, t.byteOffset, t.length)
            }
            function U(t, e) {
              var n = -1,
                r = t.length
              for (e = e || Array(r); ++n < r; ) e[n] = t[n]
              return e
            }
            function P(t, e, n) {
              var r = !n
              n = n || {}
              for (var o = -1, a = e.length; ++o < a; ) {
                var i = e[o],
                  u = Mt
                u === Mt && (u = t[i]), r ? j(n, i, u) : y(n, i, u)
              }
              return n
            }
            function R(f) {
              return (function (t) {
                return sn(et(t, void 0, It), t + "")
              })(function (t, e) {
                var n,
                  r = -1,
                  o = e.length,
                  a = 1 < o ? e[o - 1] : Mt,
                  i = 2 < o ? e[2] : Mt
                a = 3 < f.length && "function" == typeof a ? (o--, a) : Mt
                if ((n = i)) {
                  n = e[0]
                  var u = e[1]
                  if (bt(i)) {
                    var c = _typeof(u)
                    n = !!("number" == c ? st(i) && Q(u, i.length) : "string" == c && u in i) && ft(i[u], n)
                  } else n = !1
                }
                for (n && ((a = o < 3 ? Mt : a), (o = 1)), t = Object(t); ++r < o; ) (i = e[r]) && f(t, i, r, a)
                return t
              })
            }
            function $(t) {
              return vt(t) ? Mt : t
            }
            function V(t, e, n, r, o, a) {
              var i = 1 & n,
                u = t.length
              if (u != (c = e.length) && !(i && u < c)) return !1
              if ((c = a.get(t)) && a.get(e)) return c == e
              var c = -1,
                f = !0,
                s = 2 & n ? new d() : Mt
              for (a.set(t, e), a.set(e, t); ++c < u; ) {
                var l = t[c],
                  p = e[c]
                if (r) var y = i ? r(p, l, c, e, t, a) : r(l, p, c, t, e, a)
                if (y !== Mt) {
                  if (y) continue
                  f = !1
                  break
                }
                if (s) {
                  if (
                    !b(e, function (t, e) {
                      if (!s.has(e) && (l === t || o(l, t, n, r, a))) return s.push(e)
                    })
                  ) {
                    f = !1
                    break
                  }
                } else if (l !== p && !o(l, p, n, r, a)) {
                  f = !1
                  break
                }
              }
              return a.delete(t), a.delete(e), f
            }
            function H(t) {
              return O(t, Lt, tn)
            }
            function B(t) {
              return O(t, St, en)
            }
            function W(t, e) {
              var n = (n = r.iteratee || kt) === kt ? x : n
              return arguments.length ? n(t, e) : n
            }
            function G(t, e) {
              var n = t.__data__,
                r = _typeof(e)
              return (
                "string" == r || "number" == r || "symbol" == r || "boolean" == r ? "__proto__" !== e : null === e
              )
                ? n["string" == typeof e ? "string" : "hash"]
                : n.map
            }
            function q(t, e) {
              var n = null == t ? Mt : t[e]
              return !bt(n) || (he && he in n) || !(pt(n) ? ge : Gt).test(rt(n)) ? Mt : n
            }
            function J(t, e, n) {
              for (var r = -1, o = (e = F(e, t)).length, a = !1; ++r < o; ) {
                var i = nt(e[r])
                if (!(a = null != t && n(t, i))) break
                t = t[i]
              }
              return a || ++r != o ? a : !!(o = null == t ? 0 : t.length) && yt(o) && Q(i, o) && (hn(t) || bn(t))
            }
            function Y(t) {
              return "function" != typeof t.constructor || Z(t) ? {} : Ye(Oe(t))
            }
            function K(t) {
              return hn(t) || bn(t) || !!(Se && t && t[Se])
            }
            function Q(t, e) {
              var n = _typeof(t)
              return (
                !!(e = null == e ? 9007199254740991 : e) &&
                ("number" == n || ("symbol" != n && Jt.test(t))) &&
                -1 < t &&
                0 == t % 1 &&
                t < e
              )
            }
            function X(t, e) {
              if (hn(t)) return !1
              var n = _typeof(t)
              return (
                !("number" != n && "symbol" != n && "boolean" != n && null != t && !gt(t)) ||
                Pt.test(t) ||
                !Ut.test(t) ||
                (null != e && t in Object(e))
              )
            }
            function Z(t) {
              var e = t && t.constructor
              return t === (("function" == typeof e && e.prototype) || le)
            }
            function tt(e, n) {
              return function (t) {
                return null != t && t[e] === n && (n !== Mt || e in Object(t))
              }
            }
            function et(o, a, i) {
              return (
                (a = De(a === Mt ? o.length - 1 : a, 0)),
                function () {
                  for (var t = arguments, e = -1, n = De(t.length - a, 0), r = Array(n); ++e < n; ) r[e] = t[a + e]
                  for (e = -1, n = Array(a + 1); ++e < a; ) n[e] = t[e]
                  return (
                    (n[a] = i(r)),
                    (function (t, e, n) {
                      switch (n.length) {
                        case 0:
                          return t.call(e)
                        case 1:
                          return t.call(e, n[0])
                        case 2:
                          return t.call(e, n[0], n[1])
                        case 3:
                          return t.call(e, n[0], n[1], n[2])
                      }
                      return t.apply(e, n)
                    })(o, this, n)
                  )
                }
              )
            }
            function nt(t) {
              if ("string" == typeof t || gt(t)) return t
              var e = t + ""
              return "0" == e && 1 / t == -zt ? "-0" : e
            }
            function rt(t) {
              if (null == t) return ""
              try {
                return ye.call(t)
              } catch (t) {}
              return t + ""
            }
            function ot(t, e, n) {
              var r = null == t ? 0 : t.length
              return r ? ((n = null == n ? 0 : jt(n)) < 0 && (n = De(r + n, 0)), o(t, W(e, 3), n)) : -1
            }
            function at(t) {
              return null != t && t.length
                ? (function t(e, n, r, o, a) {
                    var i = -1,
                      u = e.length
                    for (r = r || K, a = a || []; ++i < u; ) {
                      var c = e[i]
                      0 < n && r(c) ? (1 < n ? t(c, n - 1, r, o, a) : f(a, c)) : o || (a[a.length] = c)
                    }
                    return a
                  })(t, 1)
                : []
            }
            function it(t) {
              var e = null == t ? 0 : t.length
              return e ? t[e - 1] : Mt
            }
            function ut(r, o) {
              function a() {
                var t = arguments,
                  e = o ? o.apply(this, t) : t[0],
                  n = a.cache
                return n.has(e) ? n.get(e) : ((t = r.apply(this, t)), (a.cache = n.set(e, t) || n), t)
              }
              if ("function" != typeof r || (null != o && "function" != typeof o))
                throw new TypeError("Expected a function")
              return (a.cache = new (ut.Cache || s)()), a
            }
            function ct(e) {
              if ("function" != typeof e) throw new TypeError("Expected a function")
              return function () {
                var t = arguments
                switch (t.length) {
                  case 0:
                    return !e.call(this)
                  case 1:
                    return !e.call(this, t[0])
                  case 2:
                    return !e.call(this, t[0], t[1])
                  case 3:
                    return !e.call(this, t[0], t[1], t[2])
                }
                return !e.apply(this, t)
              }
            }
            function ft(t, e) {
              return t === e || (t != t && e != e)
            }
            function st(t) {
              return null != t && yt(t.length) && !pt(t)
            }
            function lt(t) {
              return ht(t) && st(t)
            }
            function pt(t) {
              return (
                !!bt(t) &&
                ("[object Function]" == (t = w(t)) ||
                  "[object GeneratorFunction]" == t ||
                  "[object AsyncFunction]" == t ||
                  "[object Proxy]" == t)
              )
            }
            function yt(t) {
              return "number" == typeof t && -1 < t && 0 == t % 1 && t <= 9007199254740991
            }
            function bt(t) {
              var e = _typeof(t)
              return null != t && ("object" == e || "function" == e)
            }
            function ht(t) {
              return null != t && "object" == _typeof(t)
            }
            function vt(t) {
              return (
                !(!ht(t) || "[object Object]" != w(t)) &&
                (null === (t = Oe(t)) ||
                  ("function" == typeof (t = be.call(t, "constructor") && t.constructor) &&
                    t instanceof t &&
                    ye.call(t) == de))
              )
            }
            function dt(t) {
              return "string" == typeof t || (!hn(t) && ht(t) && "[object String]" == w(t))
            }
            function gt(t) {
              return "symbol" == _typeof(t) || (ht(t) && "[object Symbol]" == w(t))
            }
            function _t(t) {
              return t
                ? (t = mt(t)) === zt || t === -zt
                  ? 1.7976931348623157e308 * (t < 0 ? -1 : 1)
                  : t == t
                  ? t
                  : 0
                : 0 === t
                ? t
                : 0
            }
            function jt(t) {
              var e = (t = _t(t)) % 1
              return t == t ? (e ? t - e : t) : 0
            }
            function mt(t) {
              if ("number" == typeof t) return t
              if (gt(t)) return Ct
              if (
                (bt(t) && (t = bt((t = "function" == typeof t.valueOf ? t.valueOf() : t)) ? t + "" : t),
                "string" != typeof t)
              )
                return 0 === t ? t : +t
              t = t.replace($t, "")
              var e = Wt.test(t)
              return e || qt.test(t) ? Xt(t.slice(2), e ? 2 : 8) : Bt.test(t) ? Ct : +t
            }
            function At(t) {
              return P(t, St(t))
            }
            function Ot(t) {
              return null == t ? "" : N(t)
            }
            function wt(t, e, n) {
              return (t = null == t ? Mt : A(t, e)) === Mt ? n : t
            }
            function Et(t, e) {
              return null != t && J(t, e, L)
            }
            function Lt(t) {
              return st(t) ? l(t) : I(t)
            }
            function St(t) {
              if (st(t)) t = l(t, !0)
              else if (bt(t)) {
                var e,
                  n = Z(t),
                  r = []
                for (e in t) ("constructor" != e || (!n && be.call(t, e))) && r.push(e)
                t = r
              } else {
                if (((e = []), null != t)) for (n in Object(t)) e.push(n)
                t = e
              }
              return t
            }
            function Tt(t) {
              return null == t
                ? []
                : (function (e, t) {
                    return a(t, function (t) {
                      return e[t]
                    })
                  })(t, Lt(t))
            }
            function xt(t) {
              return function () {
                return t
              }
            }
            function It(t) {
              return t
            }
            function kt(t) {
              return x("function" == typeof t ? t : m(t, 1))
            }
            function Nt(t) {
              return X(t)
                ? (function (e) {
                    return function (t) {
                      return null == t ? Mt : t[e]
                    }
                  })(nt(t))
                : (function (e) {
                    return function (t) {
                      return A(t, e)
                    }
                  })(t)
            }
            function Dt() {
              return []
            }
            function Ft() {
              return !1
            }
            var Mt,
              zt = 1 / 0,
              Ct = NaN,
              Ut = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
              Pt = /^\w*$/,
              Rt = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,
              $t = /^\s+|\s+$/g,
              Vt = /\\(\\)?/g,
              Ht = /\w*$/,
              Bt = /^[-+]0x[0-9a-f]+$/i,
              Wt = /^0b[01]+$/i,
              Gt = /^\[object .+?Constructor\]$/,
              qt = /^0o[0-7]+$/i,
              Jt = /^(?:0|[1-9]\d*)$/,
              Yt = {}
            ;(Yt["[object Float32Array]"] =
              Yt["[object Float64Array]"] =
              Yt["[object Int8Array]"] =
              Yt["[object Int16Array]"] =
              Yt["[object Int32Array]"] =
              Yt["[object Uint8Array]"] =
              Yt["[object Uint8ClampedArray]"] =
              Yt["[object Uint16Array]"] =
              Yt["[object Uint32Array]"] =
                !0),
              (Yt["[object Arguments]"] =
                Yt["[object Array]"] =
                Yt["[object ArrayBuffer]"] =
                Yt["[object Boolean]"] =
                Yt["[object DataView]"] =
                Yt["[object Date]"] =
                Yt["[object Error]"] =
                Yt["[object Function]"] =
                Yt["[object Map]"] =
                Yt["[object Number]"] =
                Yt["[object Object]"] =
                Yt["[object RegExp]"] =
                Yt["[object Set]"] =
                Yt["[object String]"] =
                Yt["[object WeakMap]"] =
                  !1)
            var Kt = {}
            ;(Kt["[object Arguments]"] =
              Kt["[object Array]"] =
              Kt["[object ArrayBuffer]"] =
              Kt["[object DataView]"] =
              Kt["[object Boolean]"] =
              Kt["[object Date]"] =
              Kt["[object Float32Array]"] =
              Kt["[object Float64Array]"] =
              Kt["[object Int8Array]"] =
              Kt["[object Int16Array]"] =
              Kt["[object Int32Array]"] =
              Kt["[object Map]"] =
              Kt["[object Number]"] =
              Kt["[object Object]"] =
              Kt["[object RegExp]"] =
              Kt["[object Set]"] =
              Kt["[object String]"] =
              Kt["[object Symbol]"] =
              Kt["[object Uint8Array]"] =
              Kt["[object Uint8ClampedArray]"] =
              Kt["[object Uint16Array]"] =
              Kt["[object Uint32Array]"] =
                !0),
              (Kt["[object Error]"] = Kt["[object Function]"] = Kt["[object WeakMap]"] = !1)
            var Qt,
              Xt = parseInt,
              Zt = "object" == _typeof(On) && On && On.Object === Object && On,
              te =
                "object" == ("undefined" == typeof self ? "undefined" : _typeof(self)) &&
                self &&
                self.Object === Object &&
                self,
              ee = Zt || te || Function("return this")(),
              ne = "object" == _typeof(En) && En && !En.nodeType && En,
              re = ne && "object" == _typeof(wn) && wn && !wn.nodeType && wn,
              oe = re && re.exports === ne,
              ae = oe && Zt.process
            t: {
              try {
                Qt = ae && ae.binding && ae.binding("util")
                break t
              } catch (t) {}
              Qt = void 0
            }
            var ie,
              ue = Qt && Qt.isMap,
              ce = Qt && Qt.isSet,
              fe = Qt && Qt.isTypedArray,
              se = Array.prototype,
              le = Object.prototype,
              pe = ee["__core-js_shared__"],
              ye = Function.prototype.toString,
              be = le.hasOwnProperty,
              he = (ie = /[^.]+$/.exec((pe && pe.keys && pe.keys.IE_PROTO) || "")) ? "Symbol(src)_1." + ie : "",
              ve = le.toString,
              de = ye.call(Object),
              ge = RegExp(
                "^" +
                  ye
                    .call(be)
                    .replace(/[\\^$.*+?()[\]{}|]/g, "\\$\x26")
                    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") +
                  "$"
              ),
              _e = oe ? ee.Buffer : Mt,
              je = ee.Symbol,
              me = ee.Uint8Array,
              Ae = _e ? _e.a : Mt,
              Oe = e(Object.getPrototypeOf),
              we = Object.create,
              Ee = le.propertyIsEnumerable,
              Le = se.splice,
              Se = je ? je.isConcatSpreadable : Mt,
              Te = je ? je.toStringTag : Mt,
              xe = (function () {
                try {
                  var t = q(Object, "defineProperty")
                  return t({}, "", {}), t
                } catch (t) {}
              })(),
              Ie = Object.getOwnPropertySymbols,
              ke = _e ? _e.isBuffer : Mt,
              Ne = e(Object.keys),
              De = Math.max,
              Fe = Date.now,
              Me = q(ee, "DataView"),
              ze = q(ee, "Map"),
              Ce = q(ee, "Promise"),
              Ue = q(ee, "Set"),
              Pe = q(ee, "WeakMap"),
              Re = q(Object, "create"),
              $e = rt(Me),
              Ve = rt(ze),
              He = rt(Ce),
              Be = rt(Ue),
              We = rt(Pe),
              Ge = je ? je.prototype : Mt,
              qe = Ge ? Ge.valueOf : Mt,
              Je = Ge ? Ge.toString : Mt,
              Ye = function (t) {
                return bt(t) ? (we ? we(t) : ((Ke.prototype = t), (t = new Ke()), (Ke.prototype = Mt), t)) : {}
              }
            function Ke() {}
            ;(u.prototype.clear = function () {
              ;(this.__data__ = Re ? Re(null) : {}), (this.size = 0)
            }),
              (u.prototype.delete = function (t) {
                return (t = this.has(t) && delete this.__data__[t]), (this.size -= t ? 1 : 0), t
              }),
              (u.prototype.get = function (t) {
                var e = this.__data__
                return Re ? ("__lodash_hash_undefined__" === (t = e[t]) ? Mt : t) : be.call(e, t) ? e[t] : Mt
              }),
              (u.prototype.has = function (t) {
                var e = this.__data__
                return Re ? e[t] !== Mt : be.call(e, t)
              }),
              (u.prototype.set = function (t, e) {
                var n = this.__data__
                return (
                  (this.size += this.has(t) ? 0 : 1), (n[t] = Re && e === Mt ? "__lodash_hash_undefined__" : e), this
                )
              }),
              (c.prototype.clear = function () {
                ;(this.__data__ = []), (this.size = 0)
              }),
              (c.prototype.delete = function (t) {
                var e = this.__data__
                return !((t = p(e, t)) < 0 || (t == e.length - 1 ? e.pop() : Le.call(e, t, 1), --this.size, 0))
              }),
              (c.prototype.get = function (t) {
                var e = this.__data__
                return (t = p(e, t)) < 0 ? Mt : e[t][1]
              }),
              (c.prototype.has = function (t) {
                return -1 < p(this.__data__, t)
              }),
              (c.prototype.set = function (t, e) {
                var n = this.__data__,
                  r = p(n, t)
                return r < 0 ? (++this.size, n.push([t, e])) : (n[r][1] = e), this
              }),
              (s.prototype.clear = function () {
                ;(this.size = 0), (this.__data__ = { hash: new u(), map: new (ze || c)(), string: new u() })
              }),
              (s.prototype.delete = function (t) {
                return (t = G(this, t).delete(t)), (this.size -= t ? 1 : 0), t
              }),
              (s.prototype.get = function (t) {
                return G(this, t).get(t)
              }),
              (s.prototype.has = function (t) {
                return G(this, t).has(t)
              }),
              (s.prototype.set = function (t, e) {
                var n = G(this, t),
                  r = n.size
                return n.set(t, e), (this.size += n.size == r ? 0 : 1), this
              }),
              (d.prototype.add = d.prototype.push =
                function (t) {
                  return this.__data__.set(t, "__lodash_hash_undefined__"), this
                }),
              (d.prototype.has = function (t) {
                return this.__data__.has(t)
              }),
              (g.prototype.clear = function () {
                ;(this.__data__ = new c()), (this.size = 0)
              }),
              (g.prototype.delete = function (t) {
                var e = this.__data__
                return (t = e.delete(t)), (this.size = e.size), t
              }),
              (g.prototype.get = function (t) {
                return this.__data__.get(t)
              }),
              (g.prototype.has = function (t) {
                return this.__data__.has(t)
              }),
              (g.prototype.set = function (t, e) {
                var n = this.__data__
                if (n instanceof c) {
                  var r = n.__data__
                  if (!ze || r.length < 199) return r.push([t, e]), (this.size = ++n.size), this
                  n = this.__data__ = new s(r)
                }
                return n.set(t, e), (this.size = n.size), this
              })
            var Qe = function (t, e) {
                if (null == t) return t
                if (!st(t))
                  return (function (t, e) {
                    return t && Xe(t, e, Lt)
                  })(t, e)
                for (var n = t.length, r = -1, o = Object(t); ++r < n && !1 !== e(o[r], r, o); );
                return t
              },
              Xe = function (t, e, n) {
                for (var r = -1, o = Object(t), a = (n = n(t)).length; a--; ) {
                  var i = n[++r]
                  if (!1 === e(o[i], i, o)) break
                }
                return t
              },
              Ze = xe
                ? function (t, e) {
                    return xe(t, "toString", { configurable: !0, enumerable: !1, value: xt(e), writable: !0 })
                  }
                : It,
              tn = Ie
                ? function (e) {
                    return null == e
                      ? []
                      : ((e = Object(e)),
                        n(Ie(e), function (t) {
                          return Ee.call(e, t)
                        }))
                  }
                : Dt,
              en = Ie
                ? function (t) {
                    for (var e = []; t; ) f(e, tn(t)), (t = Oe(t))
                    return e
                  }
                : Dt,
              nn = w
            ;((Me && "[object DataView]" != nn(new Me(new ArrayBuffer(1)))) ||
              (ze && "[object Map]" != nn(new ze())) ||
              (Ce && "[object Promise]" != nn(Ce.resolve())) ||
              (Ue && "[object Set]" != nn(new Ue())) ||
              (Pe && "[object WeakMap]" != nn(new Pe()))) &&
              (nn = function (t) {
                var e = w(t)
                if ((t = (t = "[object Object]" == e ? t.constructor : Mt) ? rt(t) : ""))
                  switch (t) {
                    case $e:
                      return "[object DataView]"
                    case Ve:
                      return "[object Map]"
                    case He:
                      return "[object Promise]"
                    case Be:
                      return "[object Set]"
                    case We:
                      return "[object WeakMap]"
                  }
                return e
              })
            var rn,
              on,
              an,
              un,
              cn,
              fn,
              sn =
                ((un = Ze),
                (fn = cn = 0),
                function () {
                  var t = Fe(),
                    e = 16 - (t - fn)
                  if (((fn = t), 0 < e)) {
                    if (800 <= ++cn) return arguments[0]
                  } else cn = 0
                  return un.apply(Mt, arguments)
                }),
              ln =
                ((an = (on = ut(
                  (on = function (t) {
                    var o = []
                    return (
                      46 === t.charCodeAt(0) && o.push(""),
                      t.replace(Rt, function (t, e, n, r) {
                        o.push(n ? r.replace(Vt, "$1") : e || t)
                      }),
                      o
                    )
                  }),
                  function (t) {
                    return 500 === an.size && an.clear(), t
                  }
                )).cache),
                on),
              pn =
                ((rn = ot),
                function (t, e, n) {
                  var r = Object(t)
                  if (!st(t)) {
                    var o = W(e, 3)
                    ;(t = Lt(t)),
                      (e = function (t) {
                        return o(r[t], t, r)
                      })
                  }
                  return -1 < (e = rn(t, e, n)) ? r[o ? t[e] : e] : Mt
                })
            ut.Cache = s
            var yn,
              bn = S(
                (function () {
                  return arguments
                })()
              )
                ? S
                : function (t) {
                    return ht(t) && be.call(t, "callee") && !Ee.call(t, "callee")
                  },
              hn = Array.isArray,
              vn = ke || Ft,
              dn = ue
                ? t(ue)
                : function (t) {
                    return ht(t) && "[object Map]" == nn(t)
                  },
              gn = ce
                ? t(ce)
                : function (t) {
                    return ht(t) && "[object Set]" == nn(t)
                  },
              _n = fe
                ? t(fe)
                : function (t) {
                    return ht(t) && yt(t.length) && !!Yt[w(t)]
                  },
              jn = R(function (t, e, n) {
                k(t, e, n)
              }),
              mn = R(function (t, e, n, r) {
                k(t, e, n, r)
              }),
              An = sn(
                et(
                  (yn = function (e, t) {
                    var n = {}
                    if (null == e) return n
                    var r = !1
                    ;(t = a(t, function (t) {
                      return (t = F(t, e)), (r = r || 1 < t.length), t
                    })),
                      P(e, B(e), n),
                      r && (n = m(n, 7, $))
                    for (var o = t.length; o--; ) D(n, t[o])
                    return n
                  }),
                  Mt,
                  at
                ),
                yn + ""
              )
            ;(r.constant = xt),
              (r.flatten = at),
              (r.iteratee = kt),
              (r.keys = Lt),
              (r.keysIn = St),
              (r.memoize = ut),
              (r.merge = jn),
              (r.mergeWith = mn),
              (r.negate = ct),
              (r.omit = An),
              (r.property = Nt),
              (r.reject = function (t, e) {
                return (
                  hn(t)
                    ? n
                    : function (t, r) {
                        var o = []
                        return (
                          Qe(t, function (t, e, n) {
                            r(t, e, n) && o.push(t)
                          }),
                          o
                        )
                      }
                )(t, ct(W(e, 3)))
              }),
              (r.toPlainObject = At),
              (r.values = Tt),
              (r.cloneDeep = function (t) {
                return m(t, 5)
              }),
              (r.cloneDeepWith = function (t, e) {
                return m(t, 5, (e = "function" == typeof e ? e : Mt))
              }),
              (r.eq = ft),
              (r.find = pn),
              (r.findIndex = ot),
              (r.get = wt),
              (r.has = function (t, e) {
                return null != t && J(t, e, E)
              }),
              (r.hasIn = Et),
              (r.identity = It),
              (r.includes = function (t, e, n, r) {
                if (
                  ((t = st(t) ? t : Tt(t)),
                  (n = n && !r ? jt(n) : 0),
                  (r = t.length),
                  n < 0 && (n = De(r + n, 0)),
                  dt(t))
                )
                  t = n <= r && -1 < t.indexOf(e, n)
                else {
                  if ((r = !!r)) {
                    if (e == e)
                      t: {
                        for (n -= 1, r = t.length; ++n < r; )
                          if (t[n] === e) {
                            t = n
                            break t
                          }
                        t = -1
                      }
                    else t = o(t, i, n)
                    r = -1 < t
                  }
                  t = r
                }
                return t
              }),
              (r.isArguments = bn),
              (r.isArray = hn),
              (r.isArrayLike = st),
              (r.isArrayLikeObject = lt),
              (r.isBuffer = vn),
              (r.isEmpty = function (t) {
                if (null == t) return !0
                if (
                  st(t) &&
                  (hn(t) || "string" == typeof t || "function" == typeof t.splice || vn(t) || _n(t) || bn(t))
                )
                  return !t.length
                var e = nn(t)
                if ("[object Map]" == e || "[object Set]" == e) return !t.size
                if (Z(t)) return !I(t).length
                for (var n in t) if (be.call(t, n)) return !1
                return !0
              }),
              (r.isEqual = function (t, e) {
                return T(t, e)
              }),
              (r.isFunction = pt),
              (r.isLength = yt),
              (r.isMap = dn),
              (r.isNull = function (t) {
                return null === t
              }),
              (r.isObject = bt),
              (r.isObjectLike = ht),
              (r.isPlainObject = vt),
              (r.isSet = gn),
              (r.isString = dt),
              (r.isSymbol = gt),
              (r.isTypedArray = _n),
              (r.last = it),
              (r.stubArray = Dt),
              (r.stubFalse = Ft),
              (r.toFinite = _t),
              (r.toInteger = jt),
              (r.toNumber = mt),
              (r.toString = Ot),
              (r.VERSION = "4.17.5"),
              re && (((re.exports = r)._ = r), (ne._ = r))
          }.call(this))
        }.call(
          this,
          "undefined" != typeof global
            ? global
            : "undefined" != typeof self
            ? self
            : "undefined" != typeof window
            ? window
            : {}
        ))
      },
      {},
    ],
    2: [
      function (t, e, n) {
        e.exports = {
          itemType: {
            DATA: "data",
            FCTN: "fctn",
            EVENT: "event",
            LISTENER_ON: "listenerOn",
            LISTENER_OFF: "listenerOff",
          },
          dataLayerEvent: { CHANGE: "adobeDataLayer:change", EVENT: "adobeDataLayer:event" },
          listenerScope: { PAST: "past", FUTURE: "future", ALL: "all" },
        }
      },
      {},
    ],
    3: [
      function (t, e, n) {
        var r = t("../custom-lodash"),
          c = t("../version.json").version,
          l = r.cloneDeep,
          p = r.get,
          y = t("./item"),
          b = t("./listener"),
          h = t("./listenerManager"),
          v = t("./constants"),
          d = t("./utils/customMerge")
        e.exports = function (t) {
          var f,
            e = t || {},
            n = [],
            r = [],
            o = {},
            a = {
              getState: function () {
                return o
              },
              getDataLayer: function () {
                return n
              },
            }
          function i(t) {
            o = d(o, t.data)
          }
          function u(t) {
            t.valid
              ? {
                  data: function (t) {
                    i(t), f.triggerListeners(t)
                  },
                  fctn: function (t) {
                    t.config.call(n, n)
                  },
                  event: function (t) {
                    t.data && i(t), f.triggerListeners(t)
                  },
                  listenerOn: function (t) {
                    var e = b(t)
                    switch (e.scope) {
                      case v.listenerScope.PAST:
                        var n,
                          r = _createForOfIteratorHelper(c(t))
                        try {
                          for (r.s(); !(n = r.n()).done; ) {
                            var o = n.value
                            f.triggerListener(e, o)
                          }
                        } catch (t) {
                          r.e(t)
                        } finally {
                          r.f()
                        }
                        break
                      case v.listenerScope.FUTURE:
                        f.register(e)
                        break
                      case v.listenerScope.ALL:
                        if (f.register(e)) {
                          var a,
                            i = _createForOfIteratorHelper(c(t))
                          try {
                            for (i.s(); !(a = i.n()).done; ) {
                              var u = a.value
                              f.triggerListener(e, u)
                            }
                          } catch (t) {
                            i.e(t)
                          } finally {
                            i.f()
                          }
                        }
                    }
                  },
                  listenerOff: function (t) {
                    f.unregister(b(t))
                  },
                }[t.type](t)
              : s(t)
            function c(t) {
              return 0 === n.length || t.index > n.length - 1
                ? []
                : n.slice(0, t.index).map(function (t) {
                    return y(t)
                  })
            }
          }
          function s(t) {
            var e =
              "The following item cannot be handled by the data layer because it does not have a valid format: " +
              JSON.stringify(t.config)
            console.error(e)
          }
          return (
            (function () {
              Array.isArray(e.dataLayer) || (e.dataLayer = [])
              ;(r = e.dataLayer.splice(0, e.dataLayer.length)), ((n = e.dataLayer).version = c), (o = {}), (f = h(a))
            })(),
            (n.push = function (t) {
              var n = arguments,
                r = arguments
              if (
                (Object.keys(n).forEach(function (t) {
                  var e = y(n[t])
                  switch ((e.valid || (s(e), delete r[t]), e.type)) {
                    case v.itemType.DATA:
                    case v.itemType.EVENT:
                      u(e)
                      break
                    case v.itemType.FCTN:
                      delete r[t], u(e)
                      break
                    case v.itemType.LISTENER_ON:
                    case v.itemType.LISTENER_OFF:
                      delete r[t]
                  }
                }),
                r[0])
              )
                return Array.prototype.push.apply(this, r)
            }),
            (n.getState = function (t) {
              return t ? p(l(o), t) : l(o)
            }),
            (n.addEventListener = function (t, e, n) {
              u(y({ on: t, handler: e, scope: n && n.scope, path: n && n.path }))
            }),
            (n.removeEventListener = function (t, e) {
              u(y({ off: t, handler: e }))
            }),
            (function () {
              for (var t = 0; t < r.length; t++) n.push(r[t])
            })(),
            a
          )
        }
      },
      {
        "../custom-lodash": 1,
        "../version.json": 14,
        "./constants": 2,
        "./item": 5,
        "./listener": 7,
        "./listenerManager": 8,
        "./utils/customMerge": 10,
      },
    ],
    4: [
      function (t, e, n) {
        var r = { Manager: t("./dataLayerManager") }
        ;(window.adobeDataLayer = window.adobeDataLayer || []),
          window.adobeDataLayer.version
            ? console.warn(
                "Adobe Client Data Layer v".concat(
                  window.adobeDataLayer.version,
                  " has already been imported/initialized on this page. You may be erroneously loading it a second time."
                )
              )
            : r.Manager({ dataLayer: window.adobeDataLayer }),
          (e.exports = r)
      },
      { "./dataLayerManager": 3 },
    ],
    5: [
      function (t, e, n) {
        var r = t("../custom-lodash"),
          i = r.isPlainObject,
          u = r.isEmpty,
          c = r.omit,
          f = r.find,
          s = t("./utils/dataMatchesContraints"),
          l = t("./itemConstraints"),
          p = t("./constants")
        e.exports = function (t, e) {
          var n = t,
            r = e,
            o =
              f(Object.keys(l), function (t) {
                return s(n, l[t])
              }) ||
              ("function" == typeof n && p.itemType.FCTN) ||
              (i(n) && p.itemType.DATA),
            a = (function () {
              var t = c(n, Object.keys(l.event))
              if (!u(t)) return t
            })()
          return { config: n, type: o, data: a, valid: !!o, index: r }
        }
      },
      { "../custom-lodash": 1, "./constants": 2, "./itemConstraints": 6, "./utils/dataMatchesContraints": 11 },
    ],
    6: [
      function (t, e, n) {
        e.exports = {
          event: { event: { type: "string" }, eventInfo: { optional: !0 } },
          listenerOn: {
            on: { type: "string" },
            handler: { type: "function" },
            scope: { type: "string", values: ["past", "future", "all"], optional: !0 },
            path: { type: "string", optional: !0 },
          },
          listenerOff: {
            off: { type: "string" },
            handler: { type: "function", optional: !0 },
            scope: { type: "string", values: ["past", "future", "all"], optional: !0 },
            path: { type: "string", optional: !0 },
          },
        }
      },
      {},
    ],
    7: [
      function (t, e, n) {
        var r = t("./constants")
        e.exports = function (t) {
          return {
            event: t.config.on || t.config.off,
            handler: t.config.handler || null,
            scope: t.config.scope || (t.config.on && r.listenerScope.ALL) || null,
            path: t.config.path || null,
          }
        }
      },
      { "./constants": 2 },
    ],
    8: [
      function (t, e, n) {
        var u = t("../custom-lodash").cloneDeep,
          c = t("./constants"),
          f = t("./utils/listenerMatch"),
          s = t("./utils/indexOfListener")
        e.exports = function (t) {
          var o = {},
            r = t,
            a = s.bind(null, o)
          function i(t, e) {
            if (f(t, e)) {
              var n = [u(e.config)]
              t.handler.apply(r.getDataLayer(), n)
            }
          }
          return {
            register: function (t) {
              var e = t.event
              return Object.prototype.hasOwnProperty.call(o, e)
                ? -1 === a(t) && (o[t.event].push(t), !0)
                : ((o[t.event] = [t]), !0)
            },
            unregister: function (t) {
              var e = t.event
              if (Object.prototype.hasOwnProperty.call(o, e))
                if (t.handler || t.scope || t.path) {
                  var n = a(t)
                  ;-1 < n && o[e].splice(n, 1)
                } else o[e] = []
            },
            triggerListeners: function (r) {
              ;(function (t) {
                var e = []
                switch (t.type) {
                  case c.itemType.DATA:
                    e.push(c.dataLayerEvent.CHANGE)
                    break
                  case c.itemType.EVENT:
                    e.push(c.dataLayerEvent.EVENT),
                      t.data && e.push(c.dataLayerEvent.CHANGE),
                      t.config.event !== c.dataLayerEvent.CHANGE && e.push(t.config.event)
                }
                return e
              })(r).forEach(function (t) {
                if (Object.prototype.hasOwnProperty.call(o, t)) {
                  var e,
                    n = _createForOfIteratorHelper(o[t])
                  try {
                    for (n.s(); !(e = n.n()).done; ) i(e.value, r)
                  } catch (t) {
                    n.e(t)
                  } finally {
                    n.f()
                  }
                }
              })
            },
            triggerListener: function (t, e) {
              i(t, e)
            },
          }
        }
      },
      { "../custom-lodash": 1, "./constants": 2, "./utils/indexOfListener": 12, "./utils/listenerMatch": 13 },
    ],
    9: [
      function (t, e, n) {
        var r = t("../../custom-lodash"),
          o = r.has,
          a = r.get
        e.exports = function (t, e) {
          for (var n = e.substring(0, e.lastIndexOf(".")); n; ) {
            if (o(t, n)) {
              var r = a(t, n)
              if (null == r) return !0
            }
            n = n.substring(0, n.lastIndexOf("."))
          }
          return !1
        }
      },
      { "../../custom-lodash": 1 },
    ],
    10: [
      function (t, e, n) {
        var r = t("../../custom-lodash"),
          s = r.cloneDeepWith,
          l = r.isObject,
          p = r.isArray,
          y = r.reject,
          o = r.mergeWith,
          a = r.isNull
        e.exports = function (t, e) {
          return (
            o(t, e, function (t, e, n, r) {
              if (null == e) return null
            }),
            (t = (function (t, e) {
              return s(
                t,
                (function (f) {
                  return function e(t, n, r, o) {
                    if (l(t)) {
                      if (p(t))
                        return y(t, f).map(function (t) {
                          return s(t, e)
                        })
                      for (var a = {}, i = 0, u = Object.keys(t); i < u.length; i++) {
                        var c = u[i]
                        f(t[c]) || (a[c] = s(t[c], e))
                      }
                      return a
                    }
                  }
                })(
                  1 < arguments.length && void 0 !== e
                    ? e
                    : function (t) {
                        return !t
                      }
                )
              )
            })(t, a))
          )
        }
      },
      { "../../custom-lodash": 1 },
    ],
    11: [
      function (t, e, n) {
        var r = t("../../custom-lodash"),
          o = r.find,
          s = r.includes
        e.exports = function (c, f) {
          return (
            void 0 ===
            o(Object.keys(f), function (t) {
              var e = f[t].type,
                n = t && f[t].values,
                r = !f[t].optional,
                o = c[t],
                a = _typeof(o),
                i = e && a !== e,
                u = n && !s(n, o)
              return r ? !o || i || u : o && (i || u)
            })
          )
        }
      },
      { "../../custom-lodash": 1 },
    ],
    12: [
      function (t, e, n) {
        var c = t("../../custom-lodash").isEqual
        e.exports = function (t, e) {
          var n = e.event
          if (Object.prototype.hasOwnProperty.call(t, n)) {
            var r,
              o = _createForOfIteratorHelper(t[n].entries())
            try {
              for (o.s(); !(r = o.n()).done; ) {
                var a = _slicedToArray(r.value, 2),
                  i = a[0],
                  u = a[1]
                if (c(u.handler, e.handler)) return i
              }
            } catch (t) {
              o.e(t)
            } finally {
              o.f()
            }
          }
          return -1
        }
      },
      { "../../custom-lodash": 1 },
    ],
    13: [
      function (t, e, n) {
        var r = t("../../custom-lodash").has,
          a = t("../constants"),
          o = t("./ancestorRemoved")
        function i(t, e) {
          return !e.data || !t.path || r(e.data, t.path) || o(e.data, t.path)
        }
        e.exports = function (t, e) {
          var n = t.event,
            r = e.config,
            o = !1
          return (
            e.type === a.itemType.DATA
              ? n === a.dataLayerEvent.CHANGE && (o = i(t, e))
              : e.type === a.itemType.EVENT &&
                ((n !== a.dataLayerEvent.EVENT && n !== r.event) || (o = i(t, e)),
                e.data && n === a.dataLayerEvent.CHANGE && (o = i(t, e))),
            o
          )
        }
      },
      { "../../custom-lodash": 1, "../constants": 2, "./ancestorRemoved": 9 },
    ],
    14: [
      function (t, e, n) {
        e.exports = { version: "2.0.2" }
      },
      {},
    ],
  },
  {},
  [4]
)
;(function () {
  var dataLayerEnabled
  var dataLayer
  function addComponentToDataLayer(component) {
    dataLayer.push({ component: getComponentObject(component) })
  }
  function attachClickEventListener(element) {
    element.addEventListener("click", addClickToDataLayer)
  }
  function getComponentObject(element) {
    var component = getComponentData(element)
    var componentID = Object.keys(component)[0]
    if (component && component[componentID] && !component[componentID].parentId) {
      var parentElement = element.parentNode.closest("[data-cmp-data-layer], body")
      if (parentElement) component[componentID].parentId = parentElement.id
    }
    return component
  }
  function addClickToDataLayer(event) {
    var element = event.currentTarget
    var componentId = getClickId(element)
    dataLayer.push({ event: "cmp:click", eventInfo: { path: "component." + componentId } })
  }
  function getComponentData(element) {
    var dataLayerJson = element.dataset.cmpDataLayer
    if (dataLayerJson) return JSON.parse(dataLayerJson)
    else return undefined
  }
  function getClickId(element) {
    if (element.dataset.cmpDataLayer) return Object.keys(JSON.parse(element.dataset.cmpDataLayer))[0]
    var componentElement = element.closest("[data-cmp-data-layer]")
    return Object.keys(JSON.parse(componentElement.dataset.cmpDataLayer))[0]
  }
  function onDocumentReady() {
    dataLayerEnabled = document.body.hasAttribute("data-cmp-data-layer-enabled")
    dataLayer = dataLayerEnabled ? (window.adobeDataLayer = window.adobeDataLayer || []) : undefined
    if (dataLayerEnabled) {
      var components = document.querySelectorAll("[data-cmp-data-layer]")
      var clickableElements = document.querySelectorAll("[data-cmp-clickable]")
      components.forEach(function (component) {
        addComponentToDataLayer(component)
      })
      clickableElements.forEach(function (element) {
        attachClickEventListener(element)
      })
      dataLayer.push({ event: "cmp:loaded" })
    }
  }
  if (document.readyState !== "loading") onDocumentReady()
  else document.addEventListener("DOMContentLoaded", onDocumentReady)
})()
