const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const resolvePackageRoot = (packageName) =>
  path.dirname(require.resolve(`${packageName}/package.json`, { paths: [projectRoot] }));

const config = getDefaultConfig(projectRoot);

config.watchFolders = Array.from(new Set([...(config.watchFolders ?? []), workspaceRoot]));

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules")
  ],
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules ?? {}),
    react: resolvePackageRoot("react"),
    "react-native": resolvePackageRoot("react-native"),
    "react-native-reanimated": resolvePackageRoot("react-native-reanimated"),
    "react-native-worklets": resolvePackageRoot("react-native-worklets")
  }
};

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, "global.css"),
  configPath: path.resolve(projectRoot, "tailwind.config.js")
});
