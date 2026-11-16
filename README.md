# react-native-metro-first-platform

Without a Babel config file in the project, one Metro server gives the second platform it bundles the first platform's `Platform.OS`.

`NoBabelConfigApp/` is an app with no `.babelrc` or `babel.config.js`: `index.js` registers `App.js`, which reads `Platform.OS` into `bundledFor` and renders it. `metro.config.js` is the template's. `package.json` pins `react-native` and `@react-native/*` to `0.90.0-nightly-20261116-a1b2862a5`.

```sh
cd NoBabelConfigApp
bash repro.sh          # the nightly package.json pins
bash repro.sh 0.88.1   # react-native, @react-native/metro-config and @react-native/babel-preset at 0.88.1
```

`repro.sh` runs `npm install`, then `node repro.js <platforms>` six times. Each `repro.js` run starts one Metro server from `metro.config.js` (Metro as `@react-native/community-cli-plugin` loads it, default `maxWorkers`, transform cache off), requests `/index.bundle?platform=<p>&dev=true&minify=false` for each platform in order, and prints what `bundledFor` is in each bundle:

1. `ios,android` and `android,ios`: both platforms from one server.
2. `ios` and `android`: each platform alone.
3. `ios,android` and `android,ios` again with the template's `babel.config.js` written into the folder.

It exits 1 while a bundle from step 1 carries the other platform's `Platform.OS`, 0 once each carries its own, and 2 when a step fails or a run in steps 2 or 3 does not pass.

`ReproducerApp/` is the template's app, unchanged.

---

# Reproducer TODO list

- [x] 1. Create a new reproducer project.
- [ ] 2. Git clone your repository locally.
- [ ] 3. Edit the project to reproduce the failure you're seeing.
- [ ] 4. Push your changes, so that Github Actions can run the CI.
- [ ] 5. Make sure the repository is public and share the link with the issue you reported.

# How to use this Reproducer

This project has been created with `npx @react-native-community/cli init` and is a vanilla React Native app.

> [!IMPORTANT]  
> Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/set-up-your-environment) so that you have a working environment locally.

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

First, make sure you install dependencies with:

```bash
cd ios && bundle install && bundle exec pod install
```

Then you can run the iOS app with:

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see your new app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open `App.tsx` in your text editor of choice and edit some lines.
2. For **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Developer Menu** (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For **iOS**: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!
