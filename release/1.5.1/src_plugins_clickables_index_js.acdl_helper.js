"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkacdl_helper"] = self["webpackChunkacdl_helper"] || []).push([["src_plugins_clickables_index_js"],{

/***/ "./src/plugins/clickables/index.js":
/*!*****************************************!*\
  !*** ./src/plugins/clickables/index.js ***!
  \*****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _lib_setup_clickables__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib/setup_clickables */ \"./src/plugins/clickables/lib/setup_clickables.js\");\n/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./lib/utils */ \"./src/plugins/clickables/lib/utils.js\");\n\n\n/**\n * GENERAL PLUGIN ARCHITECTURE\n *\n * General Hints\n * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)\n * - Implement at least init()\n * - If dataLayer events should be handled, handle_event() has to be implemented\n * - DataLayer events to listen on, have to be defined in the `events` array\n * - Config can be overwritten via remote-configuration => always address config from context\n */\n\n/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__() {\n  const meta = {\n    name: \"clickables\",\n    dependencies: [],\n    events: [],\n    config: {\n      register: [\n        { selector: \"[data-cmp-clickable-link]\", event_name: \"cmp:link_click\", delay: 200 },\n        { selector: \"[data-cmp-clickable-cta]\", event_name: \"cmp:cta_click\", delay: 200 },\n      ],\n    },\n  }\n\n  return {\n    meta: Object.freeze(meta),\n\n    impl(context) {\n      return {\n        init: init(context),\n      }\n    },\n  }\n\n  /**\n   * IMPLEMENTATION FUNCTIONS\n   */\n\n  function init(context) {\n    const test = {\n      selector: \"string\",\n      event_name: \"string\",\n      delay: \"number\",\n    }\n\n    const test_result = context.config.register.map(_lib_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].has_typed_properties(test))\n\n    if (!_lib_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].all_good(test_result)) {\n      context.logger.error('Invalid configuration of config \"clickables', test_result)\n      return function () {}\n    }\n\n    const clickable = (0,_lib_setup_clickables__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(context)\n\n    return function () {\n      context.config.register.forEach(clickable)\n      context.logger.success(\"Clickable elements initialized\")\n    }\n  }\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/clickables/index.js?");

/***/ }),

/***/ "./src/plugins/clickables/lib/setup_clickables.js":
/*!********************************************************!*\
  !*** ./src/plugins/clickables/lib/setup_clickables.js ***!
  \********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ setup_clickables)\n/* harmony export */ });\nfunction setup_clickables(context) {\n  return function (args) {\n    const { selector = null, event_name = \"cmp:click\", delay = 0 } = args\n\n    const link_click_delay = function (event, element) {\n      if (!element.href) {\n        return\n      }\n\n      if (delay !== 0) {\n        event.preventDefault()\n      }\n\n      const dataLayer = parseDataLayer(element)\n\n      const openLink = () => {\n        if (element.target === \"_blank\") {\n          const newWin = window.open(element.href, \"_blank\");\n          if (!newWin) {\n            // Fallback if window.open is blocked\n            window.location = element.href;\n          }\n        } else {\n          window.location = element.href\n        }\n      }\n\n      if (!dataLayer) {\n        openLink()\n        return\n      }\n\n      context.acdl.push({\n        event: event_name,\n        eventInfo: { path: `component.${Object.keys(dataLayer)[0]}` },\n      })\n\n      if (delay !== null) {\n        setTimeout(openLink, delay)\n      }\n    }\n\n    addCustomEventListener(selector, \"click\", link_click_delay)\n    context.logger.success(`Register event \"${event_name}\" with delay ${delay}`)\n  }\n}\n\nfunction addCustomEventListener(selector, event, fn) {\n  const rootElement = document.querySelector(\"body\")\n  rootElement.addEventListener(\n    event,\n    function (e) {\n      const targetElement = e.target.matches(selector) ? e.target : e.target.closest(selector)\n      if (targetElement) fn(e, targetElement)\n    },\n    true\n  )\n}\n\nfunction parseDataLayer(element) {\n  const parseJSON = (maybeJson) => {\n    try {\n      return JSON.parse(maybeJson)\n    } catch (err) {\n      return undefined\n    }\n  }\n  return element?.dataset?.cmpDataLayer ? parseJSON(element.dataset.cmpDataLayer) : undefined\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/clickables/lib/setup_clickables.js?");

/***/ }),

/***/ "./src/plugins/clickables/lib/utils.js":
/*!*********************************************!*\
  !*** ./src/plugins/clickables/lib/utils.js ***!
  \*********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Object.freeze({\n  has_typed_properties,\n  all_good,\n}));\n\nfunction has_typed_properties(test) {\n  return function (obj_to_be_tested) {\n    const missings = Object.keys(test).reduce((acc, prop_name) => {\n      if (!has_prop(obj_to_be_tested, prop_name)) {\n        acc.push({ error: `Expect property \"${prop_name}\"` })\n        return acc\n      }\n      if (!is_type(test[prop_name], obj_to_be_tested[prop_name])) {\n        acc.push({ error: `Expect type <${test[prop_name]}> in property ${prop_name}` })\n      }\n      return acc\n    }, [])\n    return missings.length > 0 ? missings : true\n  }\n}\n\nfunction is_string(maybe_string) {\n  return typeof maybe_string === \"string\"\n}\n\nfunction is_number(maybe_number) {\n  return Number.isFinite(maybe_number)\n}\n\nfunction has_prop(obj, prop_name) {\n  return Object.prototype.hasOwnProperty.call(obj, prop_name)\n}\n\nfunction is_type(type, value) {\n  const match = {\n    string: is_string,\n    number: is_number,\n  }\n  return match[type](value)\n}\n\nfunction all_good(maybe_array) {\n  if (!Array.isArray(maybe_array)) {\n    return false\n  }\n  return maybe_array.reduce((acc, item) => {\n    if (item !== true) return false\n    return acc\n  }, true)\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/clickables/lib/utils.js?");

/***/ })

}]);