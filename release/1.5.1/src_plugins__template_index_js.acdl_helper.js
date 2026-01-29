"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkacdl_helper"] = self["webpackChunkacdl_helper"] || []).push([["src_plugins__template_index_js"],{

/***/ "./src/plugins/_template/index.js":
/*!****************************************!*\
  !*** ./src/plugins/_template/index.js ***!
  \****************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ page)\n/* harmony export */ });\n/**\n * GENERAL PLUGIN ARCHITECTURE\n *\n * General Hints\n * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)\n * - Implement at least init()\n * - If dataLayer events should be handled, handle_event() has to be implemented\n * - DataLayer events to listen on, have to be defined in the `events` array\n * - Config can be overwritten via remote-configuration => always address config from context\n */\n\nfunction page() {\n  const meta = {\n    name: \"plugin_name\",\n    dependencies: [],\n    events: [],\n    config: {},\n  }\n\n  return {\n    meta: Object.freeze(meta),\n\n    impl(context) {\n      return {\n        init: init(context),\n        handle_event: handle_event(context),\n        provider: provider(context),\n      }\n    },\n  }\n\n  /**\n   * IMPLEMENTATION FUNCTIONS\n   */\n\n  function init(_context) {\n    return function () {\n      return\n    }\n  }\n\n  function handle_event(_context) {\n    return function (_event) {\n      return\n    }\n  }\n\n  function provider(_context) {\n    return Object.freeze({\n      foo(bar) {\n        return bar\n      },\n    })\n  }\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/_template/index.js?");

/***/ })

}]);