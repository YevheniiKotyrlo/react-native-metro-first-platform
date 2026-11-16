#!/usr/bin/env bash
# Installs this project (no Babel config file), then asks one Metro server for the iOS and Android bundles in both
# orders, each platform alone in a fresh process, and both platforms again with the template's babel.config.js.
#   bash repro.sh            # the versions package.json pins (the nightly)
#   bash repro.sh 0.88.1     # react-native, @react-native/metro-config and @react-native/babel-preset at 0.88.1
# Exit status: 1 while a bundle from a server that served the other platform first carries that platform's
# Platform.OS, 0 once each bundle carries its own, 2 when a step fails or a control run does not pass.
set -u
cd "$(dirname "$0")" || exit 2

if [[ "$#" -gt 0 ]]; then
  echo "\$ npm install --no-save react-native@$1 @react-native/metro-config@$1 @react-native/babel-preset@$1"
  if ! npm install --no-audit --no-fund --no-save "react-native@$1" "@react-native/metro-config@$1" \
    "@react-native/babel-preset@$1" >npm-install.log 2>&1; then
    tail -n 20 npm-install.log
    echo "SUMMARY: ERROR - npm install failed (npm-install.log)"
    exit 2
  fi
else
  echo "\$ npm install"
  if ! npm install --no-audit --no-fund >npm-install.log 2>&1; then
    tail -n 20 npm-install.log
    echo "SUMMARY: ERROR - npm install failed (npm-install.log)"
    exit 2
  fi
fi

# Runs repro.js for one request order and records its exit status in ${code}.
run() {
  echo
  echo "\$ node repro.js $1"
  node repro.js "$1"
  code=$?
  echo "(exit ${code})"
}

defect=0
broken=0

for order in ios,android android,ios; do
  run "${order}"
  case "${code}" in
    0) ;;
    1) defect=1 ;;
    *) broken=1 ;;
  esac
done

for order in ios android; do
  run "${order}"
  [[ "${code}" -eq 0 ]] || broken=1
done

echo
echo "babel.config.js: module.exports = {presets: ['module:@react-native/babel-preset']};"
printf '%s\n' "module.exports = {presets: ['module:@react-native/babel-preset']};" >babel.config.js
trap 'rm -f babel.config.js' EXIT
for order in ios,android android,ios; do
  run "${order}"
  [[ "${code}" -eq 0 ]] || broken=1
done

echo
if [[ "${broken}" -ne 0 ]]; then
  echo "SUMMARY: ERROR - a step failed, or a run with one platform or with babel.config.js did not pass"
  exit 2
fi
if [[ "${defect}" -ne 0 ]]; then
  echo "SUMMARY: FAIL - without a Babel config, the bundle a Metro server builds second carries the Platform.OS of the platform it built first; each platform alone, and both with babel.config.js, carry their own"
  exit 1
fi
echo "SUMMARY: PASS - every bundle carries its own Platform.OS, in either order, with or without babel.config.js"
exit 0
