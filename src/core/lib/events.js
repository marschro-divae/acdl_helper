export default function (app_prefix) {
  return Object.freeze({
    ADOBE_LAUNCH_LOADED: 'launch:loaded',
    ACDL_ALL_EVENTS: 'adobeDataLayer:event',
    ACDL_HELPER_DEPENDENCIES_RESOLVED: `${app_prefix}:dependencies_resolved`,
  })
}





