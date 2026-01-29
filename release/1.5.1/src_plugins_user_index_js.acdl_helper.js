"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunkacdl_helper"] = self["webpackChunkacdl_helper"] || []).push([["src_plugins_user_index_js"],{

/***/ "./src/plugins/user/index.js":
/*!***********************************!*\
  !*** ./src/plugins/user/index.js ***!
  \***********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ user)\n/* harmony export */ });\n/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib/utils */ \"./src/plugins/user/lib/utils.js\");\n\n\n/**\n * GENERAL PLUGIN ARCHITECTURE\n *\n * General Hints\n * - Dependencies are registered in the acdl_helper dependencies array (can block the whole thing)\n * - Implement at least init()\n * - If dataLayer events should be handled, handle_event() has to be implemented\n * - DataLayer events to listen on, have to be defined in the `events` array\n * - Config can be overwritten via remote-configuration => always address config from context\n */\n\nfunction user() {\n  const meta = {\n    name: \"user\",\n    dependencies: [\"launch:loaded\"],\n    events: [],\n    config: {\n      adobe_org_id: \"\",\n      default_name: \"Anonymous\",\n    },\n  }\n\n  return {\n    meta: Object.freeze(meta),\n\n    impl(context) {\n      return {\n        init: init(context),\n        handle_event: handle_event(context),\n        provider: provider(context),\n      }\n    },\n  }\n\n  /**\n   * IMPLEMENTATION FUNCTIONS\n   */\n\n  function init(context) {\n    return function () {\n      if (!window.adobe?.optIn) {\n        context.logger.error(\"Cannot initialize user - adobe optIn framework is missing!\")\n        return\n      }\n      if (!context.config?.adobe_org_id) {\n        context.logger.error(\"Cannot initialize user - Config for 'adob_org_id' is missing!\")\n        return\n      }\n\n      const visitor = window.Visitor.getInstance(context.config.adobe_org_id)\n      visitor.getVisitorValues((_values) => {\n        context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"name\"], context.config.default_name))\n        context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"mcid\"], visitor.getMarketingCloudVisitorID()))\n        context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"local_segments\"], []))\n      })\n    }\n  }\n\n  function handle_event(_context) {\n    return function (_event) {\n      // not needed\n    }\n  }\n\n  function provider(context) {\n    return Object.freeze({\n      get(property_name) {\n        const user = context.acdl.get_state(\"user\")\n        return _lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].get_user_data(user, property_name)\n      },\n\n      add_segment(segment) {\n        const state = context.acdl.get_state()\n        const segments = state?.user?.local_segments\n        if (segments) {\n          context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"local_segments\"], segments.concat([segment])))\n        }\n      },\n\n      remove_segment(segment) {\n        const state = context.acdl.get_state()\n        const segments = state?.user?.local_segments\n        if (segments) {\n          const updated_segments = segments.map((item) => {\n            return item === segment ? null : item\n          })\n          context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"local_segments\"], updated_segments))\n        }\n      },\n\n      clear_segments() {\n        const state = context.acdl.get_state()\n        const segments = state?.user?.local_segments\n        if (segments) {\n          const updated_segments = segments.map((_item) => {\n            return null\n          })\n          context.acdl.push(_lib_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].update_object([\"user\", \"local_segments\"], updated_segments))\n        }\n      },\n    })\n  }\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/user/index.js?");

/***/ }),

/***/ "./src/plugins/user/lib/utils.js":
/*!***************************************!*\
  !*** ./src/plugins/user/lib/utils.js ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Object.freeze({\n  update_object,\n  get_user_data,\n}));\n\nfunction update_object(pathArr, data) {\n  const obj = {}\n  pathArr.reduce(function (acc, item, index, arr) {\n    if (index === arr.length - 1) return (acc[item] = data)\n    return (acc[item] = {})\n  }, obj)\n  return obj\n}\n\nfunction get_user_data(user, property_name) {\n  return user && property_name ? user[property_name] : user && !property_name ? user : undefined\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/user/lib/utils.js?");

/***/ })

}]);