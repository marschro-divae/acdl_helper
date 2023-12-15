module.exports = {
  // context: '__dirnam',

  clientLibRoot: "jcr_root/apps/divae",

  libs: [
    {
      name: "acdl_helper",
      serializationFormat: "xml",
      // this got to be removed if we build for Clud SDK
      // longCacheKey: "${project.version}-${buildNumber}-${buildstamp}",
      allowProxy: true,
      cssProcessor: ["default:none", "min:none"],
      jsProcessor: ["default:none", "min:none"],
      assets: {
        js: ["dist/**/*"],
      },
    },
  ],
}
