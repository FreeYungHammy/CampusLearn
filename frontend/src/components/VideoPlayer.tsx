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
  const hasTriedFallbackRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Get compression status from the hook
  const token = useAuthStore((state) => state.token);
  const { compressionStatus, compressedQualities, loading: statusLoading } = useVideoCompressionStatus(fileId || undefined, token || undefined);

  // Quality selection state
  const [currentQuality, setCurrentQuality] = useState<string>("480p");
  const [availableQualities] = useState<VideoQuality[]>([
    { name: "720p", label: "720p" },
    { name: "480p", label: "480p" },
    { name: "360p", label: "360p" },
  ]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate optimal video dimensions based on container and aspect ratio
  const calculateOptimalDimensions = (videoWidth: number, videoHeight: number, containerWidth: number, containerHeight: number) => {
    const aspectRatio = videoWidth / videoHeight;
    
    // Define maximum dimensions based on context
    const maxWidth = containerWidth > 600 ? 500 : Math.min(containerWidth * 0.8, 400);
    const maxHeight = containerHeight > 400 ? 300 : Math.min(containerHeight * 0.6, 250);
    
    let optimalWidth = maxWidth;
    let optimalHeight = optimalWidth / aspectRatio;
    
    // If height exceeds max, scale down by height
    if (optimalHeight > maxHeight) {
      optimalHeight = maxHeight;
      optimalWidth = optimalHeight * aspectRatio;
    }
    
    return {
      width: Math.round(optimalWidth),
      height: Math.round(optimalHeight)
    };
  };

  // Detect connection speed and optimize video source with graceful fallback
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

        if (fileId) {
          const candidateUrl = src.replace(
            "/binary",
            `/binary?quality=${selectedQuality}`,
          );
          console.log(`🔗 Original URL: ${src}`);
          console.log(`⚡ Optimized URL: ${candidateUrl}`);

          try {
            const headResp = await fetch(candidateUrl, {
              method: "HEAD",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              redirect: "manual", // avoid following to cross-origin (e.g., GCS) which can CORS-fail
            });
            // Treat redirects as unavailable rendition
            if (headResp.type === "opaqueredirect" || (headResp.status >= 300 && headResp.status < 400)) {
              console.warn("Optimized URL redirected cross-origin; using original.");
              setOptimizedSrc(src);
              return;
            }
            if (headResp.ok) {
              const contentType = headResp.headers.get("content-type") || "";
              if (contentType.includes("video") || contentType === "application/octet-stream") {
                setOptimizedSrc(candidateUrl);
              } else {
                console.warn("HEAD non-video content-type; using original.", contentType);
                setOptimizedSrc(src);
              }
            } else {
              console.warn(`HEAD ${headResp.status} for optimized; using original.`);
              setOptimizedSrc(src);
            }
          } catch (e) {
            console.warn("HEAD request failed; using original.", e);
            setOptimizedSrc(src);
          }
        } else {
          console.log(`📺 No fileId available, using original URL`);
          setOptimizedSrc(src);
        }
      } catch (error) {
        console.warn("❌ Failed to optimize video source:", error);
        setOptimizedSrc(src);
      }
    };

    hasTriedFallbackRef.current = false;
    optimizeVideoSource();
  }, [src, fileId, title, currentQuality, token]);

  // When compression finishes, clear any stuck loading overlay
  useEffect(() => {
    if (!fileId) return;
    if (compressionStatus !== "compressing" && loading) {
      setLoading(false);
    }
  }, [compressionStatus, fileId, loading]);

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
    // Don't reset isVideoPlaying - video is still ready to play, just reloading
  };

  const handleCanPlay = () => {
    console.log(`✅ Video can play for: ${title}`);
    setLoading(false);
    setIsVideoPlaying(true); // Video is ready to play, hide overlay
    console.log(`🎯 Overlay should now be hidden - video is ready to play`);

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
      console.log(
        `🔄 Video is playing original version, compression may be running in background`,
      );

      // Auto-minimize after 3 seconds for less intrusion
      setTimeout(() => {
        setIsMinimized(true);
      }, 3000);

      // Auto-hide compression indicator after 10 seconds since background compression is disabled
      setTimeout(() => {
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
    setIsVideoPlaying(true);
  };

  const handleVideoPause = () => {
    console.log(`⏸️ User paused video`);
    // Don't set isVideoPlaying to false - video is still ready to play
    // The overlay should only show during initial loading/compression, not when paused
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.target as HTMLVideoElement;
    const error = video.error;
    
    console.error("🚨 VIDEO ERROR DETAILS:");
    console.error("  - Event:", e);
    console.error("  - Video element:", video);
    console.error("  - Video error:", error);
    console.error("  - Error code:", error?.code);
    console.error("  - Error message:", error?.message);
    console.error("  - Current src:", video.src);
    console.error("  - Optimized src:", optimizedSrc);
    console.error("  - Original src:", src);
    console.error("  - File ID:", fileId);
    console.error("  - Compression status:", compressionStatus);
    console.error("  - Has tried fallback:", hasTriedFallbackRef.current);
    console.error("  - Video network state:", video.networkState);
    console.error("  - Video ready state:", video.readyState);
    
    // If compression is still in progress, don't show error
    if (compressionStatus === "compressing") {
      console.log("Video failed to load but compression is in progress, showing compression state instead of error");
      setLoading(true);
      return;
    }

    // One-time fallback to original stream if optimized variant fails
    if (!hasTriedFallbackRef.current && optimizedSrc !== src) {
      console.warn("Optimized stream failed; falling back to original.");
      hasTriedFallbackRef.current = true;
      setOptimizedSrc(src);
      setError(null);
      setLoading(true);
      if (videoRef.current) {
        // Reload video with original src
        const v = videoRef.current;
        const currentTime = v.currentTime || 0;
        // Attempt to preserve progress after switching src
        requestAnimationFrame(() => {
          try {
            v.currentTime = currentTime;
          } catch {}
        });
      }
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

      {/* Show compression overlay when compressing AND video is not playing AND not loading */}
      {isVisible && compressionStatus === "compressing" && !isVideoPlaying && !loading && (
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
                 onPause={handleVideoPause}
                 onLoad={(e) => {
                   const video = e.target as HTMLVideoElement;
                   console.log("🎬 Video load event:", {
                     src: video.src,
                     duration: video.duration,
                     networkState: video.networkState,
                     readyState: video.readyState
                   });
                 }}
                 onLoadedData={(e) => {
                   const video = e.target as HTMLVideoElement;
                   console.log("📊 Video loaded data:", {
                     src: video.src,
                     duration: video.duration,
                     videoWidth: video.videoWidth,
                     videoHeight: video.videoHeight,
                     networkState: video.networkState,
                     readyState: video.readyState
                   });
                 }}
                 onLoadedMetadata={(e) => {
                   const video = e.target as HTMLVideoElement;
                   console.log("📊 Video metadata loaded:", {
                     src: video.src,
                     duration: video.duration,
                     videoWidth: video.videoWidth,
                     videoHeight: video.videoHeight,
                     networkState: video.networkState,
                     readyState: video.readyState
                   });
                   if (video.videoWidth && video.videoHeight) {
                     setVideoDimensions({
                       width: video.videoWidth,
                       height: video.videoHeight
                     });
                     console.log(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
                   }
                 }}
          onProgress={(e) => {
            const video = e.target as HTMLVideoElement;
            if (video.buffered.length > 0) {
              console.log(
                `📊 Video progress: ${video.buffered.end(0)}/${video.duration}`,
              );
            }
          }}
          style={{
            width: "100%",
            height: "100%", /* Fill the container height */
            maxWidth: "100%",
            maxHeight: "100%",
            opacity: loading ? 0 : 1,
            transition: "opacity 0.3s ease",
            objectFit: "contain", // Ensure video fits properly
            display: "block",
            margin: "0 auto",
          }}
          title={title}
          crossOrigin="anonymous"
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* no toast notification */}

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
