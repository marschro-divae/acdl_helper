export default {
  entry: './src/core/index.js',
  output: {
    filename: 'acdl_helper.js',
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
      {
        test: /\.md$/,
        loader: 'ignore-loader'
      },
    ],
  },
}
