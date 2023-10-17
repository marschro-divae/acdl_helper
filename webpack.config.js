import webpack from "webpack"

export default {
  entry: "./src/core/index.js",
  output: {
    filename: "acdl_helper.js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(process.env.npm_package_version),
    }),
  ],
}
