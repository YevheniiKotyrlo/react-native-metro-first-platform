// Starts one Metro server for this project, which has no Babel config file, the way `react-native start` does, asks
// it for `index.bundle` for each platform named, in that order, and prints what `App.js`'s `Platform.OS` became in
// each bundle.
//   node repro.js [platforms in request order, default ios,android]
// Exit status: 1 when a bundle carries another platform's `Platform.OS`, 0 when each carries its own, 2 when a step
// fails before that can be read.
'use strict';

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const projectRoot = __dirname;
const order = (process.argv[2] ?? 'ios,android').split(',');

class StepFailed extends Error {}

function packageDir(name, from) {
  return path.dirname(require.resolve(`${name}/package.json`, {paths: [from]}));
}

function versionAt(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const {port} = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

async function main() {
  // Metro as `react-native start` loads it: through @react-native/community-cli-plugin.
  const reactNativeDir = packageDir('react-native', projectRoot);
  const cliPluginDir = packageDir('@react-native/community-cli-plugin', reactNativeDir);
  const metroDir = packageDir('metro', cliPluginDir);
  const metroConfigDir = packageDir('@react-native/metro-config', projectRoot);
  const transformerDir = packageDir('@react-native/metro-babel-transformer', metroConfigDir);
  const presetDir = packageDir('@react-native/babel-preset', transformerDir);
  console.log(
    `node ${process.version}, ${os.type()} ${os.release()} ${os.arch()}, ` +
      `react-native ${versionAt(reactNativeDir)}, metro ${versionAt(metroDir)}, ` +
      `@react-native/metro-babel-transformer ${versionAt(transformerDir)}, ` +
      `@react-native/babel-preset ${versionAt(presetDir)}`,
  );

  const babelConfigs = fs
    .readdirSync(projectRoot)
    .filter(name => /^(\.babelrc(\.\w+)?|babel\.config\.\w+)$/.test(name));
  console.log(`Babel config files in the project: ${babelConfigs.join(', ') || 'none'}`);

  const Metro = require(metroDir);
  const port = await freePort();
  const loaded = await Metro.loadConfig({cwd: projectRoot, port});
  // No transform cache, so every module is transformed in this run and nothing is written to the machine's cache;
  // a silent reporter keeps Metro's banner and progress bars out of the output.
  const config = Metro.mergeConfig(loaded, {cacheStores: [], reporter: {update() {}}});
  console.log(
    `Metro config: metro.config.js, maxWorkers ${config.maxWorkers}, ` +
      `transformer ${path.relative(projectRoot, config.transformer.babelTransformerPath)}, transform cache off`,
  );

  const {httpServer} = await Metro.runServer(config, {host: '127.0.0.1', watch: false});
  const results = [];
  try {
    for (const platform of order) {
      const request = `/index.bundle?platform=${platform}&dev=true&minify=false`;
      const response = await fetch(`http://127.0.0.1:${port}${request}`);
      const bundle = await response.text();
      if (!response.ok) {
        throw new StepFailed(`GET ${request} answered ${response.status}: ${bundle.slice(0, 400)}`);
      }
      const match = bundle.match(/\bbundledFor\s*=\s*([^;,\n]+)/);
      if (match == null) {
        throw new StepFailed(`GET ${request}: the bundle has no \`bundledFor = ...\` from App.js`);
      }
      const value = match[1].trim();
      console.log(`GET ${request} -> ${response.status}, ${bundle.length} bytes; App.js: bundledFor = ${value}`);
      results.push({platform, value});
    }
  } finally {
    httpServer.close();
  }

  const unreadable = results.filter(({value}) => !/^"\w+"$/.test(value));
  if (unreadable.length > 0) {
    throw new StepFailed(
      unreadable.map(({platform, value}) => `the ${platform} bundle sets bundledFor to ${value}`).join('; '),
    );
  }
  const wrong = results.filter(({platform, value}) => value !== `"${platform}"`);
  if (wrong.length > 0) {
    const what = wrong.map(({platform, value}) => `the ${platform} bundle has Platform.OS === ${value}`).join('; ');
    console.log(`FAIL: requested in the order ${order.join(', ')} from one Metro server, ${what}`);
    return 1;
  }
  console.log(`PASS: requested in the order ${order.join(', ')}, each bundle has its own Platform.OS`);
  return 0;
}

main().then(
  code => process.exit(code),
  error => {
    console.log(`ERROR: ${error instanceof StepFailed ? error.message : (error?.stack ?? error)}`);
    process.exit(2);
  },
);
