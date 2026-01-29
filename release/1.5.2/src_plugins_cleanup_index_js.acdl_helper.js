"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkacdl_helper"] = self["webpackChunkacdl_helper"] || []).push([["src_plugins_cleanup_index_js"],{

/***/ "./src/plugins/cleanup/index.js":
/*!**************************************!*\
  !*** ./src/plugins/cleanup/index.js ***!
  \**************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ cleanup)\n/* harmony export */ });\n/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib/utils */ \"./src/plugins/cleanup/lib/utils.js\");\n\n\n/**\n * GENERAL PLUGIN ARCHITECTURE\n *\n * General Hints\n * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)\n * - Implement at least init()\n * - If dataLayer events should be handled, handle_event() has to be implemented\n * - DataLayer events to listen on, have to be defined in the `events` array\n * - Config can be overwritten via remote-configuration => always address config from context\n */\n\nfunction cleanup() {\n  const meta = {\n    name: \"cleanup\",\n    dependencies: [],\n    events: [\"acdl_helper:cleanup\"],\n    config: {\n      keep: [],\n    },\n  }\n\n  return {\n    meta: Object.freeze(meta),\n\n    impl(context) {\n      return {\n        init: init(context),\n        handle_event: handle_event(context),\n      }\n    },\n  }\n\n  /**\n   * IMPLEMENTATION FUNCTIONS\n   */\n\n  function init(_context) {\n    return function () {\n      // nothing needed\n    }\n  }\n\n  function handle_event(context) {\n    return function (_event) {\n      const state = context.acdl.get_state()\n      const result = Object.keys(state).filter((item) => {\n        return !context.config.keep.includes(item)\n      })\n\n      result.forEach((item) => {\n        context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([item], null))\n      })\n      context.logger.info(\"DataLayer clean up ... done.\")\n    }\n  }\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/cleanup/index.js?");

/***/ }),

/***/ "./src/plugins/cleanup/lib/utils.js":
/*!******************************************!*\
  !*** ./src/plugins/cleanup/lib/utils.js ***!
  \******************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Object.freeze({\n  update_object,\n}));\n\nfunction update_object(pathArr, data) {\n  const obj = {}\n  pathArr.reduce(function (acc, item, index, arr) {\n    if (index === arr.length - 1) return (acc[item] = data)\n    return (acc[item] = {})\n  }, obj)\n  return obj\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/cleanup/lib/utils.js?");

/***/ })

}]);