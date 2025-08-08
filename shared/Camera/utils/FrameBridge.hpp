#pragma once

#include <atomic>
#include <iostream>

namespace Camera {
namespace Bridge {

// Stocke la dernière taille de frame reçue (debug)
inline std::atomic<int> g_lastWidth{0};
inline std::atomic<int> g_lastHeight{0};

inline void submitFrameInfo(int width, int height) {
  g_lastWidth.store(width, std::memory_order_relaxed);
  g_lastHeight.store(height, std::memory_order_relaxed);
  std::cout << "[Naaya::FrameBridge] Frame " << width << "x" << height << std::endl;
}

inline int getLastWidth() { return g_lastWidth.load(std::memory_order_relaxed); }
inline int getLastHeight() { return g_lastHeight.load(std::memory_order_relaxed); }

} // namespace Bridge
} // namespace Camera


