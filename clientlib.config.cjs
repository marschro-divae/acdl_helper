module.exports = {
  // context: '__dirnam',

  clientLibRoot: "jcr_root/apps/divae",

  libs: [
    {
      name: "acdl_helper",
      serializationFormat: "xml",
      longCacheKey: "${project.version}-${buildNumber}-${buildstamp}",
      allowProxy: true,
      cssProcessor: ["default:none", "min:none"],
      jsProcessor: ["default:none", "min:none"],
      assets: {
        js: ["dist/**/*"],
      },
    },
  ],
}
