module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // List your plugins here, e.g.,
      "@babel/plugin-transform-runtime",
      "react-native-reanimated/plugin", // Example for Reanimated
      "nativewind/babel", // Example for Nativewind
    ],
  };
};
