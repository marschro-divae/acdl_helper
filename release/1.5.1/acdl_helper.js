/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/plugins lazy recursive ^\\.\\/.*\\/index\\.js$":
/*!***********************************************************************!*\
  !*** ./src/plugins/ lazy ^\.\/.*\/index\.js$ strict namespace object ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("var map = {\n\t\"./_template/index.js\": [\n\t\t\"./src/plugins/_template/index.js\",\n\t\t\"src_plugins__template_index_js\"\n\t],\n\t\"./cleanup/index.js\": [\n\t\t\"./src/plugins/cleanup/index.js\",\n\t\t\"src_plugins_cleanup_index_js\"\n\t],\n\t\"./clickables/index.js\": [\n\t\t\"./src/plugins/clickables/index.js\",\n\t\t\"src_plugins_clickables_index_js\"\n\t],\n\t\"./component/index.js\": [\n\t\t\"./src/plugins/component/index.js\",\n\t\t\"src_plugins_component_index_js\"\n\t],\n\t\"./page/index.js\": [\n\t\t\"./src/plugins/page/index.js\",\n\t\t\"src_plugins_page_index_js\"\n\t],\n\t\"./user/index.js\": [\n\t\t\"./src/plugins/user/index.js\",\n\t\t\"src_plugins_user_index_js\"\n\t],\n\t\"./usercentrics/index.js\": [\n\t\t\"./src/plugins/usercentrics/index.js\",\n\t\t\"src_plugins_usercentrics_index_js\"\n\t]\n};\nfunction webpackAsyncContext(req) {\n\tif(!__webpack_require__.o(map, req)) {\n\t\treturn Promise.resolve().then(() => {\n\t\t\tvar e = new Error(\"Cannot find module '\" + req + \"'\");\n\t\t\te.code = 'MODULE_NOT_FOUND';\n\t\t\tthrow e;\n\t\t});\n\t}\n\n\tvar ids = map[req], id = ids[0];\n\treturn __webpack_require__.e(ids[1]).then(() => {\n\t\treturn __webpack_require__(id);\n\t});\n}\nwebpackAsyncContext.keys = () => (Object.keys(map));\nwebpackAsyncContext.id = \"./src/plugins lazy recursive ^\\\\.\\\\/.*\\\\/index\\\\.js$\";\nmodule.exports = webpackAsyncContext;\n\n//# sourceURL=webpack://acdl_helper/./src/plugins/_lazy_^\\.\\/.*\\/index\\.js$_strict_namespace_object?");

/***/ }),

/***/ "./src/core/acdl_helper.js":
/*!*********************************!*\
  !*** ./src/core/acdl_helper.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ acdl_helper)\n/* harmony export */ });\n/* harmony import */ var _lib_plugin_utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib/plugin_utils */ \"./src/core/lib/plugin_utils.js\");\n/* harmony import */ var _lib_event_catcher__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./lib/event_catcher */ \"./src/core/lib/event_catcher.js\");\n\n\n\nfunction acdl_helper(app) {\n  app.plugins = _lib_plugin_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].init_plugins(app.plugins, app.config.env, app.config.event_prefix)\n  _lib_plugin_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].register_plugin_event_handler(app)\n\n  app.logger.success(\"acdl_helper library initialized... API now available\")\n\n  return Object.freeze({\n    // eslint-disable-next-line no-undef\n    version: \"1.5.1\",\n    catch: (0,_lib_event_catcher__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(app),\n    ...Object.freeze(_lib_plugin_utils__WEBPACK_IMPORTED_MODULE_0__[\"default\"].get_all_plugin_provider(app)),\n  })\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/acdl_helper.js?");

/***/ }),

/***/ "./src/core/config.default.js":
/*!************************************!*\
  !*** ./src/core/config.default.js ***!
  \************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({\n  env: \"development\",\n  event_prefix: \"acdl_helper\",\n  dependencies: [\"launch:loaded\"],\n  plugins: {},\n});\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/config.default.js?");

/***/ }),

/***/ "./src/core/index.js":
/*!***************************!*\
  !*** ./src/core/index.js ***!
  \***************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _acdl_helper__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./acdl_helper */ \"./src/core/acdl_helper.js\");\n/* harmony import */ var _lib_events__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./lib/events */ \"./src/core/lib/events.js\");\n/* harmony import */ var _config_default__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./config.default */ \"./src/core/config.default.js\");\n/* harmony import */ var _lib_statics__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./lib/statics */ \"./src/core/lib/statics.js\");\n/* harmony import */ var _lib_utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./lib/utils */ \"./src/core/lib/utils.js\");\n/* harmony import */ var _lib_plugin_utils__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./lib/plugin_utils */ \"./src/core/lib/plugin_utils.js\");\n\n\n\n\n\n(function () {\n  _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].acdl.push({ event: \"acdl_helper:loaded\" })\n\n  window.acdl_helper = async function (custom_config) {\n    const EVENTS = (0,_lib_events__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(custom_config?.event_prefix || _config_default__WEBPACK_IMPORTED_MODULE_2__[\"default\"].event_prefix)\n\n    let app = {\n      logger: _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].logger(custom_config?.env || \"development\")(_lib_statics__WEBPACK_IMPORTED_MODULE_3__.LOG_PREFIX),\n      EVENTS,\n      config: _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].merge_configs(_config_default__WEBPACK_IMPORTED_MODULE_2__[\"default\"], custom_config),\n    }\n\n    app.logger.info(\"Starting initialization...\")\n\n    if (!document.body.hasAttribute(\"data-cmp-data-layer-enabled\")) {\n      app.logger.error(\"Adobe CLient Data Layer is not enabled!\", {\n        hint: \"Enable this configuration in AEM via ca-config 'DataLayer' (Part of Adobe Core Components).\",\n      })\n    }\n\n    try {\n      app = await _lib_plugin_utils__WEBPACK_IMPORTED_MODULE_5__[\"default\"].load_plugins(app)\n      app.logger.info(`${Object.keys(app.plugins).length} Plugins initialized ...`)\n    } catch (err) {\n      app.logger.error(\"Plugin initialization failed\", err)\n      app.plugins = {}\n    }\n\n    const resolve_dependencies = _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].resolve_initial_dependencies(app, (details) => {\n      app.logger.success(`Resolved ${details.length} dependencies:`)\n      _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].acdl.remove_event_listener(app.EVENTS.ACDL_ALL_EVENTS, resolve_dependencies)\n      _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].acdl.push({\n        event: app.EVENTS.ACDL_HELPER_DEPENDENCIES_RESOLVED,\n      })\n      window.acdl_helper = (0,_acdl_helper__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(app)\n    })\n\n    _lib_utils__WEBPACK_IMPORTED_MODULE_4__[\"default\"].acdl.add_event_listener(app.EVENTS.ACDL_ALL_EVENTS, resolve_dependencies)\n  }\n})()\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/index.js?");

/***/ }),

/***/ "./src/core/lib/event_catcher.js":
/*!***************************************!*\
  !*** ./src/core/lib/event_catcher.js ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(app) {\n  return function (event) {\n    const component_state = get_component_state(app)\n    return Object.freeze({\n      get: component_state(event),\n      log: () => app.logger.info(`${event?.message?.event || \"👻\"}`, component_state(event)()),\n    })\n  }\n}\n\nfunction is_function(maybe_fn) {\n  return Boolean(maybe_fn instanceof Function)\n}\n\nfunction is_dl_event(event) {\n  return Boolean(event?.message && event?.$type && event.$type.includes(\"adobe-client-data-layer\"))\n}\n\nfunction is_native_event(event) {\n  return Boolean(event?.nativeEvent)\n}\n\nfunction is_string(value) {\n  return Boolean(typeof value === \"string\")\n}\n\nfunction is_object(obj) {\n  return Boolean(typeof obj === \"object\" && obj !== null)\n}\n\nfunction get_component_state(app) {\n  return function (event) {\n    if (!is_function(window.adobeDataLayer?.getState)) {\n      app.logger.error(\"Datalayer funtion getState() not available !\")\n      return\n    }\n    if (!is_dl_event(event)) {\n      is_native_event(event)\n        ? app.logger.warning(`Caught native event: ${event?.$type}`)\n        : app.logger.warning(\"Nothing to catch\")\n      return\n    }\n    app.logger.info(\"Caught event \", { detail: { event: event.message?.event, rule: event.$rule?.name } })\n\n    const resolver = window.adobeDataLayer.getState\n    return function (test, property) {\n      const apply_test_and_filter = get_component_data(event.message, resolver)\n      const data = apply_test_and_filter(test, property)\n      return data\n    }\n  }\n}\n\nfunction get_component_data(e, resolver) {\n  if (!e) return undefined\n\n  const is_reference =\n    Object.prototype.hasOwnProperty.call(e, \"eventInfo\") &&\n    Object.prototype.hasOwnProperty.call(e.eventInfo, \"reference\")\n  const is_path =\n    Object.prototype.hasOwnProperty.call(e, \"eventInfo\") && Object.prototype.hasOwnProperty.call(e.eventInfo, \"path\")\n  const resolve_info = is_reference ? e.eventInfo.reference : is_path ? e.eventInfo.path : null\n\n  if (resolve_info) {\n    const data_layer_object = resolver(resolve_info)\n    return data_layer_object !== undefined\n      ? test_property(e, data_layer_object, resolve_info)\n      : do_not_test_property(e, data_layer_object)\n  }\n  return function (_filter, _property) {\n    return undefined\n  }\n}\n\nfunction test_property(e, data_layer_object, resolve_info) {\n  return function (test, property) {\n    const fsProperty = is_string(test) && !property ? test : property\n    const fsTest = is_object(test) ? test : undefined\n    return test_dataLayer_object(data_layer_object, fsTest, { one_of: true })\n      ? fsProperty\n        ? enrich_with_own_properties(data_layer_object, resolve_info)[fsProperty]\n        : enrich_with_own_properties(data_layer_object, resolve_info)\n      : undefined\n  }\n}\n\nfunction do_not_test_property(_e, _data_layer_object) {\n  return function (_test, _property) {\n    return undefined\n  }\n}\n\nfunction enrich_with_own_properties(dataLayerObject, path) {\n  dataLayerObject[\"dlh:ownPath\"] = path\n  dataLayerObject[\"dlh:ownId\"] = path.split(\".\")[path.split(\".\").length - 1]\n  dataLayerObject[\"dlh:parentComponent\"] = dataLayerObject[\"parentId\"]\n    ? beautify_parent(dataLayerObject[\"parentId\"])\n    : undefined\n  return dataLayerObject\n}\n\nfunction beautify_parent(parentId) {\n  return parentId.includes(\"-\") ? parentId.split(\"-\")[0] : parentId\n}\n\nfunction test_dataLayer_object(obj, test, option) {\n  const fsTest = test || {}\n  const allHaveToSucceed = !(option && option.one_of === true)\n  const testResultArray = Object.keys(fsTest)\n    .map(function (testProp) {\n      if (is_string(obj[testProp])) {\n        const match = obj[testProp].match(wildcardToRegExp(fsTest[testProp]))\n        return Boolean(match)\n      }\n      return Boolean(Object.prototype.hasOwnProperty.call(obj, testProp) && fsTest[testProp] === obj[testProp])\n    })\n    .filter(function (item) {\n      return item\n    })\n  return Object.keys(fsTest).length === 0\n    ? Boolean(obj)\n    : allHaveToSucceed\n    ? Object.keys(fsTest).length === testResultArray.length\n    : testResultArray.length > 0\n}\n\nfunction regexEscape(s) {\n  return s.replace(/[|\\\\{}()[\\]^$+*?.]/g, \"\\\\$&\")\n}\n\nfunction wildcardToRegExp(s) {\n  return new RegExp(\"^\" + s.split(/\\*+/).map(regexEscape).join(\".*\") + \"$\")\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/lib/event_catcher.js?");

/***/ }),

/***/ "./src/core/lib/events.js":
/*!********************************!*\
  !*** ./src/core/lib/events.js ***!
  \********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(app_prefix) {\n  return Object.freeze({\n    ADOBE_LAUNCH_LOADED: \"launch:loaded\",\n    ACDL_ALL_EVENTS: \"adobeDataLayer:event\",\n    ACDL_HELPER_DEPENDENCIES_RESOLVED: `${app_prefix}:dependencies_resolved`,\n  })\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/lib/events.js?");

/***/ }),

/***/ "./src/core/lib/plugin_utils.js":
/*!**************************************!*\
  !*** ./src/core/lib/plugin_utils.js ***!
  \**************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _statics__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./statics */ \"./src/core/lib/statics.js\");\n/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./utils */ \"./src/core/lib/utils.js\");\n\n\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({\n  load_plugins,\n  init_plugins,\n  register_plugin_event_handler,\n  get_all_plugin_provider,\n});\n\n/**\n * BACKGROUND\n *\n * - Plugins are loaded dynamically only if needed via web-pack chunks.\n * - All loaded and initialized plugins are then availble in `app.plugins`\n * - example how a plugin has to be implemented: see usercentrics plugin in `../plugins/usercentrics.js`\n *\n */\nasync function load_plugins(app) {\n  if (!_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_object(app.config.plugins)) {\n    throw TypeError(\n      _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].message(\"Plugins are expected to be an object with key (plugin-id) and value (plugin config object)\")\n        .as_error\n    )\n  }\n\n  const plugin_list = Object.keys(app.config.plugins)\n\n  const { plugins, dependencies } = await Promise.all(\n    plugin_list.map(async (plugin_name) => {\n      try {\n        const plugin_module = await __webpack_require__(\"./src/plugins lazy recursive ^\\\\.\\\\/.*\\\\/index\\\\.js$\")(`./${plugin_name}/index.js`)\n        const plugin = plugin_module.default()\n        const maybe_custom_config_for_plugin =\n          _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_object(app.config.plugins[plugin_name]) && app.config.plugins[plugin_name]\n        plugin.config = Object.freeze({\n          ...plugin.meta.config,\n          ...maybe_custom_config_for_plugin,\n        })\n        return plugin\n      } catch (err) {\n        app.logger.error(`Plugin \"${plugin_name}\" not found!`, err)\n        return\n      }\n    })\n  )\n    .then((plugins_array) => {\n      return plugins_array.reduce(\n        (acc, plugin) => {\n          if (!plugin) return acc\n          acc.plugins[plugin.meta.name] = plugin\n          acc.dependencies.push(plugin.meta.dependencies)\n          return acc\n        },\n        { plugins: {}, dependencies: [] }\n      )\n    })\n    .catch((_err) => {\n      throw Error(_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].message(\"Something went incredibly wrong during plugin loading...\").as_error)\n    })\n\n  app.config.dependencies = app.config.dependencies.concat(dependencies.flat())\n  app.plugins = plugins\n  return app\n}\n\n/**\n * BACKGROUND\n *\n * - If the plugins need more context, this is a good place to handle it\n * - Currently, we provide the logger, the plugins config, an event-prefix and the acdl helper functions\n * - and a shared object space, to be used by plugins and to make it available to the greater context\n *\n */\nfunction init_plugins(plugins, env, event_prefix) {\n  Object.keys(plugins).forEach((plugin_key) => {\n    // 1. Check if the plugin correctly provides the impl() function\n    if (!_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_function(plugins[plugin_key].impl)) {\n      throw Error(_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].message(`Plugin \"${plugin_key}\" does not implement function impl()`).as_error)\n    }\n\n    // 2. Create a context for the plugin\n    const context = Object.freeze({\n      logger: _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].logger(env)(`[${_statics__WEBPACK_IMPORTED_MODULE_0__.LOG_PLUGIN_PREFIX}: ${plugin_key}]`),\n      config: plugins[plugin_key].config,\n      event_prefix: `${event_prefix}:${plugin_key}`,\n      acdl: _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].acdl,\n      shared: {},\n    })\n\n    // 3. Invoke the impl() function of the plugin with the context\n    plugins[plugin_key].impl = plugins[plugin_key].impl(context)\n\n    // 4. Check if the plugin implements the init() function\n    if (!_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_function(plugins[plugin_key].impl.init)) {\n      throw Error(_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].message(`Plugin \"${plugin_key}\" does not implement function init()`).as_error)\n    }\n\n    // 5. Call the init() function of the plugin\n    plugins[plugin_key].impl.init()\n\n    // 6. Check if the plugin provides optional provider functions. If so, invoke it with context\n    if (_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_function(plugins[plugin_key].impl.provider)) {\n      plugins[plugin_key].impl.provider = plugins[plugin_key].impl.provider(context)\n    }\n  })\n\n  return plugins\n}\n\n/**\n * BACKGROUND\n *\n * Every plugin, that uses dataLayer events in order to do something, has to implement a handle_event() function.\n * The handle_evetn() function processes the event (delegate to plugin)\n *\n */\nfunction register_plugin_event_handler(app) {\n  const event_handler = Object.keys(app.plugins).reduce((acc, plugin_key) => {\n    const events = app.plugins[plugin_key]?.meta?.events\n    const handler = app.plugins[plugin_key]?.impl?.handle_event\n    const valid_events = Array.isArray(events)\n    const valid_handler = _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_function(handler)\n    if (valid_events && valid_handler) {\n      events.forEach((event) => {\n        _utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].acdl.add_event_listener(event, handler)\n      })\n    }\n    acc[plugin_key] = { events, handler: valid_handler ? \"found\" : \"missing\" }\n    return acc\n  }, {})\n  app.logger.info(\"Registered plugin event-handlers:\", { event_handler })\n}\n\n/**\n * BACKGROUND\n *\n * Providers are basically functions, implemented in plugins and provided in the\n * acdl_helper interface via name-spaced objects.\n * Namespaces are identical with the plugin names => TODO: prevent possible conflicts\n *\n */\nfunction get_all_plugin_provider(app) {\n  const plugin_list = Object.keys(app.plugins)\n  return plugin_list.reduce((acc, key) => {\n    if (_utils__WEBPACK_IMPORTED_MODULE_1__[\"default\"].is_object(app.plugins[key]?.impl?.provider)) {\n      acc[key] = app.plugins[key]?.impl?.provider\n    }\n    return acc\n  }, {})\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/lib/plugin_utils.js?");

/***/ }),

/***/ "./src/core/lib/statics.js":
/*!*********************************!*\
  !*** ./src/core/lib/statics.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   LOG_PLUGIN_PREFIX: () => (/* binding */ LOG_PLUGIN_PREFIX),\n/* harmony export */   LOG_PREFIX: () => (/* binding */ LOG_PREFIX)\n/* harmony export */ });\nconst LOG_PREFIX = \"[acdl_helper]\"\nconst LOG_PLUGIN_PREFIX = \"acdl_plugin\"\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/lib/statics.js?");

/***/ }),

/***/ "./src/core/lib/utils.js":
/*!*******************************!*\
  !*** ./src/core/lib/utils.js ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\n/* harmony import */ var _statics__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./statics */ \"./src/core/lib/statics.js\");\n\n\nconst acdl = gen_acdl()\n\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Object.freeze({\n  is_object,\n  resolve_initial_dependencies,\n  logger,\n  is_function,\n  update_object,\n  message,\n  acdl,\n  merge_configs,\n}));\n\nfunction is_object(obj) {\n  return Boolean(typeof obj === \"object\" && obj !== null)\n}\n\nfunction is_function(maybe_fn) {\n  return Boolean(maybe_fn instanceof Function)\n}\n\nfunction message(message, prefix = _statics__WEBPACK_IMPORTED_MODULE_0__.LOG_PREFIX) {\n  return {\n    as_info: `%c${prefix} – ${message}`,\n    as_success: `%c${prefix} – ${message}`,\n    as_warning: `%c${prefix} – ${message}`,\n    as_error: `%c${prefix} – ${message}`,\n  }\n}\n\nfunction logger(environment = \"development\") {\n  const allow = environment === \"development\"\n  return function (prefix = \"[acdl_helper]\") {\n    return {\n      info: (msg, ...args) => allow && console.log(message(msg, prefix).as_info, \"\", ...args),\n      success: (msg, ...args) => allow && console.log(message(msg, prefix).as_success, \"color: green\", ...args),\n      warning: (msg, ...args) => allow && console.log(message(msg, prefix).as_warning, \"color: orange\", ...args),\n      error: (msg, ...args) => allow && console.log(message(msg, prefix).as_error, \"color: red\", ...args),\n    }\n  }\n}\n\nfunction gen_acdl() {\n  return Object.freeze({\n    push(data) {\n      window.adobeDataLayer = window.adobeDataLayer || []\n      window.adobeDataLayer.push(data)\n    },\n\n    add_event_listener(event, handler, options) {\n      window.adobeDataLayer = window.adobeDataLayer || []\n      window.adobeDataLayer.push(function (dl) {\n        dl.addEventListener(event, handler, options)\n      })\n    },\n\n    remove_event_listener(event, handler) {\n      window.adobeDataLayer = window.adobeDataLayer || []\n      window.adobeDataLayer.push(function (dl) {\n        dl.removeEventListener(event, handler)\n      })\n    },\n\n    get_state(reference) {\n      if (!is_function(window.adobeDataLayer?.getState)) {\n        throw Error(message(\"Adobe Client Data Layer not (yet) initialized\").as_error)\n      }\n      return window.adobeDataLayer.getState(reference)\n    },\n  })\n}\n\nfunction execute_once(fn) {\n  let done = false\n  return function (...args) {\n    if (!done) {\n      done = true\n      fn(...args)\n    }\n  }\n}\n\nfunction resolve_initial_dependencies(app, fn) {\n  if (!Array.isArray(app?.config?.dependencies)) {\n    throw TypeError(message(\"Dependencies are expected to be an array of event names\").as_error)\n  }\n\n  let deps = Array.from(new Set(app.config.dependencies))\n  const safe_callback = execute_once(fn)\n  const resolve_data = []\n  app.logger.warning(`Awaiting ${deps.length} dependencies ...`, { dependencies: deps })\n\n  return function (obj) {\n    const isDependecy = deps.find((i) => i === obj.event) ? obj : false\n    if (isDependecy) {\n      resolve_data.push(obj)\n    }\n    deps = deps.length === 0 ? deps : deps.filter((item) => item !== obj.event)\n    if (deps.length === 0) {\n      safe_callback(resolve_data)\n    }\n  }\n}\n\nfunction update_object(pathArr, data) {\n  const obj = {}\n  pathArr.reduce(function (acc, item, index, arr) {\n    if (index === arr.length - 1) return (acc[item] = data)\n    return (acc[item] = {})\n  }, obj)\n  return obj\n}\n\nfunction merge_configs(base, customize) {\n  if (!customize) {\n    return base\n  }\n  const all_plugins = { ...base.plugins, ...customize.plugins }\n  return { ...base, ...customize, plugins: all_plugins }\n}\n\n\n//# sourceURL=webpack://acdl_helper/./src/core/lib/utils.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "" + chunkId + ".acdl_helper.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/load script */
/******/ 	(() => {
/******/ 		var inProgress = {};
/******/ 		var dataWebpackPrefix = "acdl_helper:";
/******/ 		// loadScript function to load a script via script tag
/******/ 		__webpack_require__.l = (url, done, key, chunkId) => {
/******/ 			if(inProgress[url]) { inProgress[url].push(done); return; }
/******/ 			var script, needAttach;
/******/ 			if(key !== undefined) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				for(var i = 0; i < scripts.length; i++) {
/******/ 					var s = scripts[i];
/******/ 					if(s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) { script = s; break; }
/******/ 				}
/******/ 			}
/******/ 			if(!script) {
/******/ 				needAttach = true;
/******/ 				script = document.createElement('script');
/******/ 		
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.setAttribute("data-webpack", dataWebpackPrefix + key);
/******/ 		
/******/ 				script.src = url;
/******/ 			}
/******/ 			inProgress[url] = [done];
/******/ 			var onScriptComplete = (prev, event) => {
/******/ 				// avoid mem leaks in IE.
/******/ 				script.onerror = script.onload = null;
/******/ 				clearTimeout(timeout);
/******/ 				var doneFns = inProgress[url];
/******/ 				delete inProgress[url];
/******/ 				script.parentNode && script.parentNode.removeChild(script);
/******/ 				doneFns && doneFns.forEach((fn) => (fn(event)));
/******/ 				if(prev) return prev(event);
/******/ 			}
/******/ 			var timeout = setTimeout(onScriptComplete.bind(null, undefined, { type: 'timeout', target: script }), 120000);
/******/ 			script.onerror = onScriptComplete.bind(null, script.onerror);
/******/ 			script.onload = onScriptComplete.bind(null, script.onload);
/******/ 			needAttach && document.head.appendChild(script);
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"main": 0
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.f.j = (chunkId, promises) => {
/******/ 				// JSONP chunk loading for javascript
/******/ 				var installedChunkData = __webpack_require__.o(installedChunks, chunkId) ? installedChunks[chunkId] : undefined;
/******/ 				if(installedChunkData !== 0) { // 0 means "already installed".
/******/ 		
/******/ 					// a Promise means "currently loading".
/******/ 					if(installedChunkData) {
/******/ 						promises.push(installedChunkData[2]);
/******/ 					} else {
/******/ 						if(true) { // all chunks have JS
/******/ 							// setup Promise in chunk cache
/******/ 							var promise = new Promise((resolve, reject) => (installedChunkData = installedChunks[chunkId] = [resolve, reject]));
/******/ 							promises.push(installedChunkData[2] = promise);
/******/ 		
/******/ 							// start chunk loading
/******/ 							var url = __webpack_require__.p + __webpack_require__.u(chunkId);
/******/ 							// create error before stack unwound to get useful stacktrace later
/******/ 							var error = new Error();
/******/ 							var loadingEnded = (event) => {
/******/ 								if(__webpack_require__.o(installedChunks, chunkId)) {
/******/ 									installedChunkData = installedChunks[chunkId];
/******/ 									if(installedChunkData !== 0) installedChunks[chunkId] = undefined;
/******/ 									if(installedChunkData) {
/******/ 										var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 										var realSrc = event && event.target && event.target.src;
/******/ 										error.message = 'Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')';
/******/ 										error.name = 'ChunkLoadError';
/******/ 										error.type = errorType;
/******/ 										error.request = realSrc;
/******/ 										installedChunkData[1](error);
/******/ 									}
/******/ 								}
/******/ 							};
/******/ 							__webpack_require__.l(url, loadingEnded, "chunk-" + chunkId, chunkId);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 		};
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 		
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkacdl_helper"] = self["webpackChunkacdl_helper"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/core/index.js");
/******/ 	
/******/ })()
;