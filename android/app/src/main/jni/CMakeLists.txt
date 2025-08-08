cmake_minimum_required(VERSION 3.13)

# Define the library name here.
project(appmodules)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Define where the additional source code lives. We need to crawl back the jni, main, src, app, android folders
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/NativeCameraModule.cpp)

# Camera core
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/core/CameraManager.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/capture/PhotoCapture.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/capture/VideoCapture.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/controls/FlashController.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/controls/ZoomController.cpp)
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../shared/Camera/utils/PermissionManager.cpp)



# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../shared/Camera)

# RN Android entry point
target_sources(${CMAKE_PROJECT_NAME} PRIVATE OnLoad.cpp)

# Linkage supplémentaire
target_link_libraries(${CMAKE_PROJECT_NAME} log)