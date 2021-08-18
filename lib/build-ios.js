const exec = require('child_process').execSync;
const path = require('path');
const fs = require('fs');

const iosToolChainFile = path.join(__dirname, '../cmake/ios.toolchain.cmake');

function createPlist(pluginName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>English</string>
    <key>CFBundleExecutable</key>
    <string>${pluginName}</string>
    <key>CFBundleIdentifier</key>
    <string>com.openkraken.plugins.${pluginName.replace(/_/g, '-')}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundlePackageType</key>
    <string>FMWK</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CSResourcesFileMapped</key>
    <true/>
    <key>MinimumOSVersion</key>
    <string>9.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
  </dict>
  </plist>`
}

function buildIOS(root, projectName) {
  exec(`cmake -DCMAKE_MODULE_PATH=${path.join(__dirname, '../cmake')} -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_TOOLCHAIN_FILE=${iosToolChainFile} \
  -DPLATFORM=SIMULATOR64 \
  -DENABLE_BITCODE=FALSE -G "Unix Makefiles" \
  -B ${root}/cmake-build-ios-x64 -S ${root}`, {
    cwd: root,
    env: {
      ...process.env,
      KRAKEN_JS_ENGINE: 'jsc'
    },
    stdio: 'inherit'
  });
  exec(`cmake --build ${root}/cmake-build-ios-x64 --target ${projectName} -- -j 4`, {stdio: 'inherit'});

  exec(`cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_TOOLCHAIN_FILE=${iosToolChainFile} \
  -DPLATFORM=OS \
  -DENABLE_BITCODE=FALSE -G "Unix Makefiles" \
  -B ${root}/cmake-build-arm -S ${root}`, {
    cwd: root,
    env: {
      ...process.env,
      KRAKEN_JS_ENGINE: 'jsc'
    },
    stdio: 'inherit'
  });
  exec(`cmake --build ${root}/cmake-build-arm --target ${projectName} -- -j 4`, {stdio: 'inherit'});

  exec(`cmake -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_TOOLCHAIN_FILE=${iosToolChainFile} \
  -DPLATFORM=OS64 \
  -DENABLE_BITCODE=FALSE -G "Unix Makefiles" \
  -B ${root}/cmake-build-arm64 -S ${root}`, {
    cwd: root,
    env: {
      ...process.env,
      KRAKEN_JS_ENGINE: 'jsc'
    },
    stdio: 'inherit'
  });
  exec(`cmake --build ${root}/cmake-build-arm64 --target ${projectName} -- -j 4`, {stdio: 'inherit'});

  const x86FrameworkPATH = path.join(root, `cmake-build-ios-x64/${projectName}.framework/${projectName}`);
  const armFrameworkPATH = path.join(root, `cmake-build-arm/${projectName}.framework/${projectName}`);
  const arm64FrameworkPATH = path.join(root, `cmake-build-arm64/${projectName}.framework/${projectName}`);

  const targetFrameworkPATH = path.join(root, `../ios/${projectName}.framework`);
  exec(`mkdir -p ${targetFrameworkPATH}`);
  exec(`lipo -create ${x86FrameworkPATH} ${armFrameworkPATH} ${arm64FrameworkPATH} -output ${targetFrameworkPATH}/${projectName}`, { stdio: 'inherit' });

  let plistFile = createPlist(projectName);
  fs.writeFileSync(`${targetFrameworkPATH}/Info.plist`, plistFile);

  exec(`dsymutil ${targetFrameworkPATH}/${projectName}`, { stdio: 'inherit'});
  exec(`mv ${targetFrameworkPATH}/${projectName}.dSYM ${targetFrameworkPATH}/../`)
  exec(`strip -S -X -x ${targetFrameworkPATH}/${projectName}`, {stdio: 'inherit'});
  exec(`install_name_tool -change /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/JavaScriptCore  @rpath/JavaScriptCore.framework/Versions/A/JavaScriptCore ${targetFrameworkPATH}/${projectName}`, {stdio: 'inherit'});
}

module.exports = buildIOS;
