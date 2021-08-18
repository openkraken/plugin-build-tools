const fs = require('fs');
const PATH = require('path');
const fg = require('fast-glob');
const { getProjectName } = require('../lib/util');

const krakenCMakeConfig = PATH.join(__dirname, '../kraken.cmake');

function searchSourceFiles(root) {
  const bridgeDirectory = PATH.join(root, 'bridge');
  const files = fg.sync(['**/*.cc', '**/*.h', '!kraken/**'], {cwd: bridgeDirectory, dot: true, followSymbolicLinks: false});
  return files;
}

function generateCMake(root) {
  const ccSource = searchSourceFiles(root);
  const projectName = getProjectName(root);

  const template = `cmake_minimum_required(VERSION 3.2.0)
project(${projectName})

set (CMAKE_MODULE_PATH ${PATH.join(__dirname, '../cmake')})
find_package(kraken)

add_library(${projectName} SHARED
  ${ccSource.join('\n')}
)

if ($ENV{KRAKEN_JS_ENGINE} MATCHES "jsc")
  set_target_properties(${projectName} PROPERTIES OUTPUT_NAME ${projectName}_jsc)
endif()

list(APPEND BRIDGE_INCLUDE \${CMAKE_CURRENT_SOURCE_DIR})
target_link_libraries(${projectName} \${BRIDGE_LINK_LIBS} kraken)
target_include_directories(${projectName} PUBLIC \${BRIDGE_INCLUDE})

if (\${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
  set_target_properties(${projectName}
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY "\${CMAKE_CURRENT_SOURCE_DIR}/../macos"
        )
elseif(\${CMAKE_SYSTEM_NAME} MATCHES "Android")
  set_target_properties(${projectName}
        PROPERTIES
        LIBRARY_OUTPUT_DIRECTORY "\${CMAKE_CURRENT_SOURCE_DIR}/../android/jniLibs/\${ANDROID_ABI}/"
        )
endif()

if (\${CMAKE_SYSTEM_NAME} MATCHES "iOS")
  set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED "NO")
  set(CMAKE_XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY "")

  set_target_properties(${projectName} PROPERTIES
          OUTPUT_NAME ${projectName}
          FRAMEWORK TRUE
          FRAMEWORK_VERSION C
          MACOSX_FRAMEWORK_IDENTIFIER com.openkraken.plugins.${projectName}
          )
endif()
  `;

  let cmakeFilePath = PATH.join(root, 'bridge/CMakeLists.txt');
  if (!fs.existsSync(cmakeFilePath)) {
    fs.writeFileSync(PATH.join(root, 'bridge/CMakeLists.txt'), template);
  }
}

module.exports = generateCMake;
