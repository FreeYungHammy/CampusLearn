/**
 * Connection speed detection utility
 * Helps determine the best video quality to serve based on user's connection
 */

export interface ConnectionInfo {
  speed: "slow" | "medium" | "fast";
  estimatedBandwidth: number; // in kbps
  isMobile: boolean;
}

export class ConnectionDetector {
  private static instance: ConnectionDetector;
  private connectionInfo: ConnectionInfo | null = null;
  private detectionPromise: Promise<ConnectionInfo> | null = null;

  static getInstance(): ConnectionDetector {
    if (!this.instance) {
      this.instance = new ConnectionDetector();
    }
    return this.instance;
  }

  /**
   * Detect connection speed using multiple methods
   */
  async detectConnectionSpeed(): Promise<ConnectionInfo> {
    if (this.connectionInfo) {
      return this.connectionInfo;
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.performDetection();
    this.connectionInfo = await this.detectionPromise;
    return this.connectionInfo;
  }

  private async performDetection(): Promise<ConnectionInfo> {
    const isMobile = this.isMobileDevice();

    try {
      // Method 1: Use Network Information API if available
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType) {
          return this.mapEffectiveTypeToSpeed(
            connection.effectiveType,
            isMobile,
          );
        }
      }

      // Method 2: Use Connection API if available
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        if (connection.downlink) {
          return this.mapDownlinkToSpeed(connection.downlink, isMobile);
        }
      }

      // Method 3: Fallback based on user agent and other heuristics
      return this.fallbackDetection(isMobile);
    } catch (error) {
      console.warn("Connection detection failed, using fallback:", error);
      return this.fallbackDetection(isMobile);
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  private mapEffectiveTypeToSpeed(
    effectiveType: string,
    isMobile: boolean,
  ): ConnectionInfo {
    const speedMap: {
      [key: string]: { speed: "slow" | "medium" | "fast"; bandwidth: number };
    } = {
      "slow-2g": { speed: "slow", bandwidth: 50 },
      "2g": { speed: "slow", bandwidth: 100 },
      "3g": { speed: "medium", bandwidth: 500 },
      "4g": { speed: "fast", bandwidth: 2000 },
    };

    const info = speedMap[effectiveType] || {
      speed: "medium",
      bandwidth: 1000,
    };

    // Adjust for mobile devices
    if (isMobile && info.bandwidth > 1000) {
      info.bandwidth = Math.min(info.bandwidth, 1500);
    }

    return {
      speed: info.speed,
      estimatedBandwidth: info.bandwidth,
      isMobile,
    };
  }

  private mapDownlinkToSpeed(
    downlink: number,
    isMobile: boolean,
  ): ConnectionInfo {
    let speed: "slow" | "medium" | "fast";
    let bandwidth = downlink * 1000; // Convert to kbps

    if (bandwidth < 500) {
      speed = "slow";
    } else if (bandwidth < 2000) {
      speed = "medium";
    } else {
      speed = "fast";
    }

    // Adjust for mobile devices
    if (isMobile && bandwidth > 2000) {
      bandwidth = Math.min(bandwidth, 2500);
      speed = "medium";
    }

    return {
      speed,
      estimatedBandwidth: bandwidth,
      isMobile,
    };
  }

  private fallbackDetection(isMobile: boolean): ConnectionInfo {
    // Conservative fallback - assume medium connection
    return {
      speed: "medium",
      estimatedBandwidth: isMobile ? 800 : 1500,
      isMobile,
    };
  }

  /**
   * Get recommended video quality based on connection speed
   */
  getRecommendedQuality(connectionInfo: ConnectionInfo): string {
    if (connectionInfo.isMobile) {
      // More conservative for mobile
      switch (connectionInfo.speed) {
        case "slow":
          return "360p";
        case "medium":
          return "360p"; // Force 360p for mobile
        case "fast":
          return "480p"; // Force 480p for mobile
        default:
          return "360p";
      }
    } else {
      // Desktop - force lower quality for faster loading
      switch (connectionInfo.speed) {
        case "slow":
          return "360p";
        case "medium":
          return "480p"; // Force 480p instead of 720p
        case "fast":
          return "480p"; // Force 480p instead of 720p
        default:
          return "480p";
      }
    }
  }

  /**
   * Check if connection speed has changed (for dynamic quality adjustment)
   */
  async recheckConnectionSpeed(): Promise<ConnectionInfo> {
    this.connectionInfo = null;
    this.detectionPromise = null;
    return this.detectConnectionSpeed();
  }
}
