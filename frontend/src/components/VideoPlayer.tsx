import React, { useState, useRef, useEffect } from "react";
import { ConnectionDetector } from "../utils/connectionDetector";
import { VideoPerformanceMonitor } from "../utils/videoPerformanceMonitor";
import VideoQualitySelector, { VideoQuality } from "./VideoQualitySelector";
import { useVideoCompressionStatus } from "../hooks/useVideoCompressionStatus";
import { useAuthStore } from "../store/authStore";
import "./VideoQualitySelector.css";

interface VideoPlayerProps {
  src: string;
  title: string;
  fileId?: string;
  className?: string;
  style?: React.CSSProperties;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  fileId,
  className = "",
  style = {},
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Get compression status from the hook
  const token = useAuthStore((state) => state.token);
  const { compressionStatus, compressedQualities, loading: statusLoading } = useVideoCompressionStatus(fileId, token);

  // Quality selection state
  const [currentQuality, setCurrentQuality] = useState<string>("480p");
  const [availableQualities] = useState<VideoQuality[]>([
    { name: "720p", label: "720p" },
    { name: "480p", label: "480p" },
    { name: "360p", label: "360p" },
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect connection speed and optimize video source
  useEffect(() => {
    const optimizeVideoSource = async () => {
      try {
        console.log(`🎬 VideoPlayer: Starting optimization for ${title}`);

        const selectedQuality = currentQuality;
        console.log(`🎯 Selected quality: ${selectedQuality}`);

        // Start performance tracking
        if (fileId) {
          const performanceMonitor = VideoPerformanceMonitor.getInstance();
          performanceMonitor.startTracking(fileId, selectedQuality, "manual");
        }

        // Always optimize the URL with quality parameter for better chunking
        if (fileId) {
          const optimizedUrl = src.replace(
            "/binary",
            `/binary?quality=${selectedQuality}`,
          );
          console.log(`🔗 Original URL: ${src}`);
          console.log(`⚡ Optimized URL: ${optimizedUrl}`);
          setOptimizedSrc(optimizedUrl);
        } else {
          console.log(`📺 No fileId available, using original URL`);
        }
      } catch (error) {
        console.warn("❌ Failed to optimize video source:", error);
        // Keep original src if optimization fails
      }
    };

    optimizeVideoSource();
  }, [src, fileId, title, currentQuality]);

  // Intersection Observer for lazy loading with aggressive preloading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "200px", // Start loading 200px before the video comes into view
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoadStart = () => {
    console.log(`🎬 Video loading started for: ${title}`);
    setLoading(true);
    setError(null);
  };

  const handleCanPlay = () => {
    console.log(`✅ Video can play for: ${title}`);
    setLoading(false);

    // Record performance metrics
    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordFirstFrame(fileId);
    }

    // Check if this is the original video (might be compressing in background)
    if (
      optimizedSrc.includes("quality=480p") &&
      !optimizedSrc.includes("compressed")
    ) {
      setCompressionStatus("compressing");
      console.log(
        `🔄 Video is playing original version, compression may be running in background`,
      );

      // Auto-minimize after 3 seconds for less intrusion
      setTimeout(() => {
        setIsMinimized(true);
      }, 3000);

      // Auto-hide compression indicator after 10 seconds since background compression is disabled
      setTimeout(() => {
        setCompressionStatus("none");
        console.log(
          `✅ Compression indicator auto-hidden (background compression disabled)`,
        );
      }, 10000);
    }
  };

  const handleVideoClick = () => {
    console.log(`👆 User clicked video`);
  };

  const handleVideoPlay = () => {
    console.log(`▶️ User started playing video`);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video loading error:", e);
    
    // If compression is still in progress, don't show error
    if (compressionStatus === "compressing") {
      console.log("Video failed to load but compression is in progress, showing compression state instead of error");
      setLoading(true);
      return;
    }
    
    setError("Failed to load video. Please try again.");
    setLoading(false);

    // Record error in performance monitoring
    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordError(fileId, "Video loading failed");
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${className}`}
      style={{ position: "relative", ...style }}
      onClick={handleVideoClick}
    >
      {/* Show placeholder when not visible */}
      {!isVisible && (
        <div className="video-placeholder">
          {fileId && (
            <img
              src={`${src.replace("/binary", "/thumbnail")}`}
              alt={`${title} thumbnail`}
              className="video-thumbnail"
              onError={(e) => {
                // Hide thumbnail if it fails to load
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className="placeholder-content">
            <i className="fas fa-play-circle"></i>
            <p>Click to load video</p>
          </div>
        </div>
      )}

      {/* Show compression overlay when compressing */}
      {isVisible && compressionStatus === "compressing" && (
        <div className="video-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Processing video...</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.5rem' }}>
              Your video is being optimized for better streaming. This may take a few minutes.
            </p>
          </div>
        </div>
      )}

      {/* Show loading overlay only when visible and loading (and not compressing) */}
      {isVisible && loading && !error && compressionStatus !== "compressing" && (
        <div className="video-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading video...</p>
          </div>
        </div>
      )}

      {/* Show error overlay only when visible and has error (and not compressing) */}
      {isVisible && error && compressionStatus !== "compressing" && (
        <div className="video-error-overlay">
          <div className="error-content">
            <i className="fas fa-exclamation-triangle"></i>
            <p>{error}</p>
            <button onClick={handleRetry} className="retry-btn">
              <i className="fas fa-redo"></i> Retry
            </button>
          </div>
        </div>
      )}

      {/* Show video only when visible */}
      {isVisible && (
        <video
          ref={videoRef}
          src={optimizedSrc}
          controls
          preload="auto"
          playsInline
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onError={handleError}
          onClick={handleVideoClick}
          onPlay={handleVideoPlay}
          onProgress={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.buffered.length > 0) {
              console.log(
                `📊 Video progress: ${video.buffered.end(0)}/${video.duration}`,
              );
            }
          }}
          onLoadedMetadata={() => {
            console.log(`📊 Video metadata loaded - ready to play`);
          }}
          style={{
            width: "100%",
            height: "100%",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.3s ease",
            objectFit: "contain", // Ensure video fits properly
          }}
          title={title}
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* Quality Selector - only show when video is visible */}
      {isVisible && !loading && !error && (
        <div className="video-quality-controls">
          <VideoQualitySelector
            currentQuality={currentQuality}
            availableQualities={availableQualities}
            onQualityChange={setCurrentQuality}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
