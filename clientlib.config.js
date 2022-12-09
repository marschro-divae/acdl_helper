module.exports = {
  // context: '__dirnam',

  clientLibRoot: "clientlibs-root",

  libs: [
    {
      name: "acdl_helper",
      serializationFormat: "json",
      longCacheKey: "${project.version}-${buildNumber}",
      allowProxy: true,
      cssProcessor: ["default:none", "min:none"],
      jsProcessor: ["default:none", "min:none"],
      assets: {
        js: ["dist/**/*"],
      },
    },
  ],
}
