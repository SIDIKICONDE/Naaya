#pragma once

#include <chrono>
#include <string>
#include <iostream>
#include <iomanip>
#include <vector>
#include <numeric>

namespace Performance {

class Benchmark {
public:
    using Clock = std::chrono::high_resolution_clock;
    using TimePoint = Clock::time_point;
    using Duration = std::chrono::duration<double, std::milli>;
    
    Benchmark(const std::string& name) : name_(name) {}
    
    void start() {
        startTime_ = Clock::now();
    }
    
    void stop() {
        endTime_ = Clock::now();
        Duration elapsed = endTime_ - startTime_;
        measurements_.push_back(elapsed.count());
    }
    
    double getLastTime() const {
        return measurements_.empty() ? 0.0 : measurements_.back();
    }
    
    double getAverageTime() const {
        if (measurements_.empty()) return 0.0;
        double sum = std::accumulate(measurements_.begin(), measurements_.end(), 0.0);
        return sum / measurements_.size();
    }
    
    double getMinTime() const {
        if (measurements_.empty()) return 0.0;
        return *std::min_element(measurements_.begin(), measurements_.end());
    }
    
    double getMaxTime() const {
        if (measurements_.empty()) return 0.0;
        return *std::max_element(measurements_.begin(), measurements_.end());
    }
    
    void reset() {
        measurements_.clear();
    }
    
    void printReport() const {
        std::cout << "\n=== Benchmark: " << name_ << " ===" << std::endl;
        std::cout << std::fixed << std::setprecision(3);
        std::cout << "Samples: " << measurements_.size() << std::endl;
        std::cout << "Average: " << getAverageTime() << " ms" << std::endl;
        std::cout << "Min: " << getMinTime() << " ms" << std::endl;
        std::cout << "Max: " << getMaxTime() << " ms" << std::endl;
        
        // Calculate throughput if we have frame information
        if (frameSize_ > 0 && !measurements_.empty()) {
            double avgTimeSeconds = getAverageTime() / 1000.0;
            double framesPerSecond = 1.0 / avgTimeSeconds;
            double megapixelsPerSecond = (frameSize_ * framesPerSecond) / 1000000.0;
            std::cout << "Throughput: " << framesPerSecond << " fps" << std::endl;
            std::cout << "            " << megapixelsPerSecond << " MP/s" << std::endl;
        }
    }
    
    void setFrameSize(size_t width, size_t height) {
        frameSize_ = width * height;
    }
    
private:
    std::string name_;
    TimePoint startTime_;
    TimePoint endTime_;
    std::vector<double> measurements_;
    size_t frameSize_{0};
};

// RAII timer for automatic timing
class ScopedTimer {
public:
    ScopedTimer(Benchmark& benchmark) : benchmark_(benchmark) {
        benchmark_.start();
    }
    
    ~ScopedTimer() {
        benchmark_.stop();
    }
    
private:
    Benchmark& benchmark_;
};

// Macro for easy timing
#define BENCHMARK_SCOPE(benchmark) Performance::ScopedTimer _timer(benchmark)

// Performance metrics collection
class MetricsCollector {
public:
    static MetricsCollector& getInstance() {
        static MetricsCollector instance;
        return instance;
    }
    
    void addMetric(const std::string& name, double value) {
        metrics_[name].push_back(value);
    }
    
    void printAllMetrics() const {
        std::cout << "\n=== Performance Metrics Summary ===" << std::endl;
        for (const auto& [name, values] : metrics_) {
            if (!values.empty()) {
                double avg = std::accumulate(values.begin(), values.end(), 0.0) / values.size();
                std::cout << name << ": " << std::fixed << std::setprecision(3) 
                         << avg << " ms (avg of " << values.size() << " samples)" << std::endl;
            }
        }
    }
    
    void reset() {
        metrics_.clear();
    }
    
private:
    MetricsCollector() = default;
    std::unordered_map<std::string, std::vector<double>> metrics_;
};

// Memory usage tracker
class MemoryTracker {
public:
    static size_t getCurrentMemoryUsage() {
        // Platform-specific implementation would go here
        // For now, return a placeholder
        return 0;
    }
    
    static void printMemoryStats() {
        std::cout << "\n=== Memory Statistics ===" << std::endl;
        std::cout << "Current usage: " << getCurrentMemoryUsage() / (1024 * 1024) << " MB" << std::endl;
    }
};

} // namespace Performance