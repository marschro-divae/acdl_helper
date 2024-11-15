"use strict";(self.webpackChunkacdl_helper=self.webpackChunkacdl_helper||[]).push([[516],{516:(e,n,t)=>{function o(e,n,t){const o=n||{},a=!(t&&!0===t.one_of),i=Object.keys(o).map((function(n){if("string"==typeof e[n]){const a=e[n].match((t=o[n],new RegExp("^"+t.split(/\*+/).map(r).join(".*")+"$")));return Boolean(a)}var t;return Boolean(Object.prototype.hasOwnProperty.call(e,n)&&o[n]===e[n])})).filter((function(e){return e}));return 0===Object.keys(o).length?Boolean(e):a?Object.keys(o).length===i.length:i.length>0}function r(e){return e.replace(/[|\\{}()[\]^$+*?.]/g,"\\$&")}function a(e,n){var t;return e["dlh:ownPath"]=n,e["dlh:ownId"]=n.split(".")[n.split(".").length-1],e["dlh:parentComponent"]=e.parentId?(t=e.parentId).includes("-")?t.split("-")[0]:t:void 0,e}function i(e){const n=e?e.split("/").filter((function(e){return""!==e})).map((function(e){return e.replace(".html","")})).reduce((function(e,n,t){return t>1&&e.push(n),e}),[]):void 0;return n?n.join(" : "):"Cannot resolve pageId!"}function c(e){const n=e?e.split("/").filter((function(e){return""!==e})).map((function(e){return e.replace(".html","")})).reduce((function(e,n,t){if(1===t){const t=n.split("-").map((function(e){return`${e.charAt(0).toUpperCase()}${e.slice(1)}`})).filter((function(e){return e})).join(" ");e.push(t)}return e}),[]):void 0;return n?n.join(" : "):"Cannot resolve tenant!"}function p(e,n){const t=n.replace("?","").split("&"),o=t?t.filter((function(e){return""!==e})).reduce((function(e,n){const t=n.split("=");return Object.prototype.hasOwnProperty.call(e,t[0])&&(e[t[0]]=t[1]),e}),e):void 0;var r;return o?Object.keys(o).map((r=o,function(e){return r[e]})).join(":").replace(/^:+$/,""):""}t.r(n),t.d(n,{default:()=>s});const l=Object.freeze({get_page_data:function(e,n){return e&&n?e[n]:e&&!n?e:void 0},fulfiller:function(e,n,t){if(!Array.isArray(n))return;let r=!1;const a=[],i=e=>t();return window.addEventListener("beforeunload",i),function(c){return function(p){r||0===(n=n.filter((e=>e===p.event?(a.push(e),!1):!(u(e)&&!o(c,e.cond)||u(e)&&e.event===p.event&&o(c,e.cond)&&(a.push(e),1))))).length&&(window.removeEventListener("beforeunload",i),e.success("Resolved page dependencies",a),r=!0,t())}}},is_valid_dependecies_item:function(e){return"string"==typeof e?null:u(e)?Object.hasOwn(e,"event")?Object.hasOwn(e,"cond")?null:"Invalid dependency item: Missing 'cond' property":"Invalid dependency item: Missing 'event' property":"Invalid dependency item: Not an object!"}});function u(e){return"object"==typeof e&&null!==e}function s(){return{meta:Object.freeze({name:"page",dependencies:[],events:["cmp:show"],config:{component_types:[{"@type":"*/components/page"},{"@type":"*/components/page/content"},{"@type":"*/components/page/press"},{"@type":"*/components/page/event"},{"@type":"*/components/global/integrator-page"},{"@type":"*/components/global/page"}],prefix:"dlh",page_load_event:"load",page_load_dependencies:[],cid_mapping:{utm_source:"",utm_medium:"",utm_campaign:"",utm_term:"",utm_content:"",utm_id:""}}}),impl:o=>({init:e(o),handle_event:n(o),provider:t(o)})};function e(e){return function(){var n;n=e.config?.component_types,!n||Array.isArray(n)?n.forEach((n=>{Object.prototype.hasOwnProperty.call(n,"@type")||e.logger.error('Missing "@type" field in configuration: ',n)})):e.logger.error("config.component_types is an invalid configuration"),(n=>{if(n&&!Array.isArray(n))return void e.logger.error("config.page_load_dependencies is an invalid configuration");const t=n.map((e=>l.is_valid_dependecies_item(e))).filter((e=>e));t.length>0&&e.logger.error("config.page_load_dependencies has errors: ",t)})(e.config?.page_load_dependencies)}}function n(e){let n;return function(t){const r=()=>{e.acdl.remove_event_listener("adobeDataLayer:event",n),setTimeout((()=>{e.logger.success(`Page resolved. Pushing "${e.config.page_load_event}" event to the dataLayer`),e.acdl.push({event:`${e.event_prefix}:${e.config.page_load_event}`,eventInfo:{path:e.shared.page_component}})}),0)},u=function(e,n){if(e){if(Object.prototype.hasOwnProperty.call(e,"eventInfo")&&Object.prototype.hasOwnProperty.call(e.eventInfo,"path")){const t=n(e.eventInfo.path);return void 0!==t?function(n,r){const i="string"!=typeof n||r?r:n;return o(t,"object"==typeof n?n:void 0,{one_of:!0})?i?a(t,e.eventInfo.path)[i]:a(t,e.eventInfo.path):void 0}:function(e,n){}}return function(e,n){}}}(t,window.adobeDataLayer.getState);e.config.component_types.reduce(((e,n)=>e||!!u(n)),!1)?(e.shared.page_component=function(e,n){const t=e?.message?.eventInfo?.path||e?.eventInfo?.path;return n.acdl.push((function(e){const o=(r=n.config.prefix,function(e){return`${r}:${e}`});var r;const a=e.getState(t),l=a["xdm:tags"],u=null!==l&&Array.isArray(l)&&l.length>0?l.join(";"):"",s=function(e,n){const t={};return e.split(".").reduce((function(e,t,o,r){return o===r.length-1?e[t]=n:e[t]={}}),t),t}(t,{[o("pageId")]:i(a["repo:path"]),[o("tenant")]:c(a["repo:path"]),[o("pagename")]:(f=a["repo:path"],f?f.split("/").filter((function(e){return""!==e})).map((function(e){return e.replace(".html","")})).reduce((function(e,n,t,o){return t===o.length-1?e+n:e}),""):void 0),[o("pagetype")]:(d=a["xdm:template"],d?d.split("/").filter((function(e){return""!==e})).map((function(e){return`${e.charAt(0).toUpperCase()}${e.slice(1)}`})).reduce((function(e,n,t,o){return t===o.length-1?e+n:e}),""):void 0),[o("cid")]:p(n.config.cid_mapping,document.location.search),[o("pagetags")]:u,[o("ownPath")]:t,[o("ownId")]:t.split(".")[t.split(".").length-1]});var d,f;n.acdl.push(s)})),t}(t,e),e.config.page_load_dependencies.length>0?(n=l.fulfiller(e.logger,e.config.page_load_dependencies,r),n=n(e.acdl.get_state(e.shared.page_component)),e.acdl.add_event_listener("adobeDataLayer:event",n,{scope:"all"})):r()):e.logger.error("Cannot resolve page. Pagetype is unmatched. Please check or update your configuration!")}}function t(e){return Object.freeze({get(n){const t=e.acdl.get_state(e.shared.page_component);return l.get_page_data(t,n)}})}}}}]);