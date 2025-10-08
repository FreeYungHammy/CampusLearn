import { redis } from "../config/redis";
import { createLogger } from "../config/logger";
import { UserModel } from "../schemas/user.schema";
import mongoose from "mongoose";

const logger = createLogger("HealthService");

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "warning" | "error";
  message: string;
  responseTime?: number;
  lastChecked: Date;
}

export const HealthService = {
  /**
   * Check database connectivity and performance
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return {
          name: "Database",
          status: "error",
          message: "MongoDB not connected",
          lastChecked: new Date(),
        };
      }

      // Perform a simple read operation to test connectivity and performance
      const userCount = await UserModel.countDocuments().limit(1);
      const responseTime = Date.now() - startTime;

      // Determine status based on response time
      let status: "healthy" | "warning" | "error" = "healthy";
      let message = `Connected (${responseTime}ms)`;

      if (responseTime > 1000) {
        status = "warning";
        message = `Slow response (${responseTime}ms)`;
      } else if (responseTime > 5000) {
        status = "error";
        message = `Very slow response (${responseTime}ms)`;
      }

      return {
        name: "Database",
        status,
        message,
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("Database health check failed:", error);
      return {
        name: "Database",
        status: "error",
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  },

  /**
   * Check Redis cache connectivity and performance
   */
  async checkCache(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test Redis connectivity with a simple ping
      const pong = await redis.ping();
      const responseTime = Date.now() - startTime;

      if (pong !== "PONG") {
        return {
          name: "Cache (Redis)",
          status: "error",
          message: "Unexpected ping response",
          responseTime,
          lastChecked: new Date(),
        };
      }

      // Test read/write operations
      const testKey = `health_check_${Date.now()}`;
      const testValue = "health_check_value";

      await redis.setex(testKey, 10, testValue); // 10 second TTL
      const retrievedValue = await redis.get(testKey);
      await redis.del(testKey); // Clean up

      if (retrievedValue !== testValue) {
        return {
          name: "Cache (Redis)",
          status: "error",
          message: "Read/write test failed",
          responseTime,
          lastChecked: new Date(),
        };
      }

      let status: "healthy" | "warning" | "error" = "healthy";
      let message = `Connected (${responseTime}ms)`;

      if (responseTime > 100) {
        status = "warning";
        message = `Slow response (${responseTime}ms)`;
      } else if (responseTime > 500) {
        status = "error";
        message = `Very slow response (${responseTime}ms)`;
      }

      return {
        name: "Cache (Redis)",
        status,
        message,
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("Cache health check failed:", error);
      return {
        name: "Cache (Redis)",
        status: "error",
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  },

  /**
   * Check backend API health
   */
  async checkBackend(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Check if the server is responsive by testing a simple operation
      // We'll use the existing health endpoint
      const response = await fetch(
        `http://localhost:${process.env.PORT || 5001}/health`,
      );
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: "Backend API",
          status: "error",
          message: `HTTP ${response.status}`,
          responseTime,
          lastChecked: new Date(),
        };
      }

      const data = await response.json();
      if (!data.ok) {
        return {
          name: "Backend API",
          status: "error",
          message: "Health endpoint returned error",
          responseTime,
          lastChecked: new Date(),
        };
      }

      let status: "healthy" | "warning" | "error" = "healthy";
      let message = `Operational (${responseTime}ms)`;

      if (responseTime > 200) {
        status = "warning";
        message = `Slow response (${responseTime}ms)`;
      } else if (responseTime > 1000) {
        status = "error";
        message = `Very slow response (${responseTime}ms)`;
      }

      return {
        name: "Backend API",
        status,
        message,
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("Backend health check failed:", error);
      return {
        name: "Backend API",
        status: "error",
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  },

  /**
   * Check WebSocket server health
   */
  async checkWebSocket(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Check if Socket.IO server is running by testing the ping endpoint
      const response = await fetch(
        `http://localhost:${process.env.PORT || 5001}/__ping`,
      );
      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: "WebSocket Server",
          status: "error",
          message: `HTTP ${response.status}`,
          responseTime,
          lastChecked: new Date(),
        };
      }

      const data = await response.text();
      if (data !== "All is operational.") {
        return {
          name: "WebSocket Server",
          status: "error",
          message: "Unexpected ping response",
          responseTime,
          lastChecked: new Date(),
        };
      }

      let status: "healthy" | "warning" | "error" = "healthy";
      let message = `Operational (${responseTime}ms)`;

      if (responseTime > 200) {
        status = "warning";
        message = `Slow response (${responseTime}ms)`;
      } else if (responseTime > 1000) {
        status = "error";
        message = `Very slow response (${responseTime}ms)`;
      }

      return {
        name: "WebSocket Server",
        status,
        message,
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("WebSocket health check failed:", error);
      return {
        name: "WebSocket Server",
        status: "error",
        message: `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  },

  /**
   * Check system resources (memory usage)
   */
  async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: "healthy" | "warning" | "error" = "healthy";
      let message = `Memory: ${Math.round(memoryUsagePercent)}% used`;

      if (memoryUsagePercent > 80) {
        status = "warning";
        message = `High memory usage: ${Math.round(memoryUsagePercent)}%`;
      } else if (memoryUsagePercent > 95) {
        status = "error";
        message = `Critical memory usage: ${Math.round(memoryUsagePercent)}%`;
      }

      return {
        name: "System Resources",
        status,
        message,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      logger.error("System resources health check failed:", error);
      return {
        name: "System Resources",
        status: "error",
        message: `Check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
      };
    }
  },

  /**
   * Calculate aggregate connection speed score
   */
  calculateAggregateScore(healthChecks: HealthCheckResult[]): {
    score: number;
    averageResponseTime: number;
    status: "excellent" | "good" | "fair" | "warning" | "error";
    message: string;
  } {
    const validChecks = healthChecks.filter(
      (check) => check.responseTime !== undefined,
    );

    if (validChecks.length === 0) {
      return {
        score: 0,
        averageResponseTime: 0,
        status: "error",
        message: "No connection data available",
      };
    }

    const totalResponseTime = validChecks.reduce(
      (sum, check) => sum + (check.responseTime || 0),
      0,
    );
    const averageResponseTime = totalResponseTime / validChecks.length;

    // Calculate score (0-100, higher is better)
    let score: number;
    let status: "excellent" | "good" | "fair" | "warning" | "error";
    let message: string;

    if (averageResponseTime <= 100) {
      score = 95 + Math.max(0, 5 - averageResponseTime / 20); // 95-100
      status = "excellent";
      message = "Excellent - Very fast connections";
    } else if (averageResponseTime <= 300) {
      score = 80 + (200 / averageResponseTime) * 15; // 80-95
      status = "good";
      message = "Good - Fast connections";
    } else if (averageResponseTime <= 500) {
      score = 60 + (400 / averageResponseTime) * 20; // 60-80
      status = "fair";
      message = "Fair - Moderate connections";
    } else if (averageResponseTime <= 1000) {
      score = 40 + (500 / averageResponseTime) * 20; // 40-60
      status = "warning";
      message = "Warning - Slow connections";
    } else {
      score = Math.max(0, 40 - (averageResponseTime - 1000) / 50); // 0-40
      status = "error";
      message = "Error - Very slow connections";
    }

    return {
      score: Math.round(score),
      averageResponseTime: Math.round(averageResponseTime),
      status,
      message,
    };
  },

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const checks = [
      this.checkDatabase(),
      this.checkCache(),
      this.checkBackend(),
      this.checkWebSocket(),
      this.checkSystemResources(),
    ];

    try {
      const results = await Promise.allSettled(checks);
      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          const checkNames = [
            "Database",
            "Cache (Redis)",
            "Backend API",
            "WebSocket Server",
            "System Resources",
          ];
          return {
            name: checkNames[index] || "Unknown",
            status: "error" as const,
            message: `Check failed: ${result.reason}`,
            lastChecked: new Date(),
          };
        }
      });
    } catch (error) {
      logger.error("Health checks failed:", error);
      return [
        {
          name: "Health Checks",
          status: "error",
          message: `System error: ${error instanceof Error ? error.message : "Unknown error"}`,
          lastChecked: new Date(),
        },
      ];
    }
  },
};
