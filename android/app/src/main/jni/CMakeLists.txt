cmake_minimum_required(VERSION 3.13)

# Define the library name here.
project(appmodules)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Define where the additional source code lives. We need to crawl back the jni, main, src, app, android folders
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeCameraModule.cpp)
# Filters TurboModule
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeCameraFiltersModule.cpp)

# Camera core
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/core/CameraManager.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/capture/PhotoCapture.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/capture/VideoCapture.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE VideoCaptureAndroid.cpp)
# Audio bridge
target_sources(${CMAKE_PROJECT_NAME} PRIVATE AudioEQBridge.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/controls/FlashController.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/controls/ZoomController.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/utils/PermissionManager.cpp)
# Filters core
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/filters/FilterManager.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/filters/FilterFactory.cpp)
# FFmpeg-backed processor
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/filters/FFmpegFilterProcessor.cpp)

# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared/Camera)
# Add Audio include root
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared/Audio)
# FFmpeg headers (copied into jni/)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
# Add ffmpeg exported includes
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/ffmpeg/include)

# Enable FFmpeg code paths
target_compile_definitions(${CMAKE_PROJECT_NAME} PUBLIC FFMPEG_AVAILABLE)

# RN Android entry point
target_sources(${CMAKE_PROJECT_NAME} PRIVATE OnLoad.cpp)

# Linkage supplémentaire (FFmpeg dynlibs depuis jniLibs)
target_link_libraries(${CMAKE_PROJECT_NAME}
  log
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libavcodec.so
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libavfilter.so
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libavformat.so
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libavutil.so
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libswresample.so
  ${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libswscale.so
)