import React, { useState, useRef, useEffect, useMemo } from "react";
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
  const [isVisible, setIsVisible] = useState(true); // Start as visible for immediate loading feedback
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("original");
  const hasTriedFallbackRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);
  
  // Get compression status from the hook
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { compressionStatus, compressedQualities, loading: statusLoading } = useVideoCompressionStatus(fileId || undefined, token || undefined);

  // Quality selection state - only show qualities that are actually available
  const availableQualities = useMemo(() => {
    if (compressionStatus === 'completed' && compressedQualities.length > 0) {
      return compressedQualities.map(q => ({ name: q, label: q }));
    }
    return [{ name: 'original', label: 'Original' }];
  }, [compressionStatus, compressedQualities]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update current quality when available qualities change
  useEffect(() => {
    if (availableQualities.length > 0 && !availableQualities.some(q => q.name === currentQuality)) {
      // If current quality is not available, switch to the first available quality
      const newQuality = availableQualities[0].name;
      console.log(`🔄 Switching from unavailable quality ${currentQuality} to ${newQuality}`);
      setCurrentQuality(newQuality);
    }
  }, [availableQualities, currentQuality]);

  // Debug: Log when optimizedSrc changes
  useEffect(() => {
    console.log(`🔄 optimizedSrc changed:`, optimizedSrc);
  }, [optimizedSrc]);

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
        
        // Set loading state immediately when starting optimization
        setLoading(true);
        setError(null);

        const selectedQuality = currentQuality;
        console.log(`🎯 Selected quality: ${selectedQuality}`);

        // Start performance tracking
        if (fileId) {
          const performanceMonitor = VideoPerformanceMonitor.getInstance();
          performanceMonitor.startTracking(fileId, selectedQuality, "manual");
        }

        if (fileId) {
          let candidateUrl: string;
          
          if (selectedQuality === 'original') {
            // Use original URL without quality parameter
            candidateUrl = `${src}${token ? `?token=${token}` : ''}`;
          } else {
            // Use compressed quality URL
            const baseUrl = src.replace("/binary", "");
            candidateUrl = `${baseUrl}/binary?quality=${selectedQuality}${token ? `&token=${token}` : ''}`;
          }
          
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
              const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
              setOptimizedSrc(fallbackUrl);
              return;
            }
            if (headResp.ok) {
              const contentType = headResp.headers.get("content-type") || "";
              console.log(`✅ HEAD request successful, content-type: ${contentType}`);
              if (contentType.includes("video") || contentType === "application/octet-stream") {
                console.log(`🎯 Setting optimizedSrc to: ${candidateUrl}`);
                setOptimizedSrc(candidateUrl);
              } else {
                console.warn("HEAD non-video content-type; using original.", contentType);
                const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
                console.log(`🔄 Setting optimizedSrc to fallback: ${fallbackUrl}`);
                setOptimizedSrc(fallbackUrl);
              }
            } else if (headResp.status === 202) {
              console.log(`⏳ Video is being processed (202 Accepted), will retry in a moment`);
              // Keep loading state active and retry after a delay
              setTimeout(() => {
                console.log(`🔄 Retrying video optimization after processing delay`);
                setRetryCounter(prev => prev + 1); // Trigger re-run of useEffect
              }, 3000); // Retry after 3 seconds
              return; // Exit early to prevent fallback
            } else {
              console.warn(`HEAD ${headResp.status} for optimized; using original.`);
              const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
              console.log(`🔄 Setting optimizedSrc to fallback: ${fallbackUrl}`);
              console.log(`🔑 Token for fallback:`, token ? 'present' : 'missing');
              setOptimizedSrc(fallbackUrl);
            }
          } catch (e) {
            console.warn("HEAD request failed; using original.", e);
            const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
            console.log(`🔄 Setting optimizedSrc to fallback (catch): ${fallbackUrl}`);
            setOptimizedSrc(fallbackUrl);
          }
        } else {
          console.log(`📺 No fileId available, using original URL`);
          const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
          console.log(`🔄 Setting optimizedSrc to fallback (no fileId): ${fallbackUrl}`);
          setOptimizedSrc(fallbackUrl);
        }
      } catch (error) {
        console.warn("❌ Failed to optimize video source:", error);
        const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
        console.log(`🔄 Setting optimizedSrc to fallback (main catch): ${fallbackUrl}`);
        setOptimizedSrc(fallbackUrl);
      }
    };

    hasTriedFallbackRef.current = false;
    optimizeVideoSource();
  }, [src, fileId, title, currentQuality, token, retryCounter]);

  // When optimizedSrc changes, ensure loading state is properly managed
  useEffect(() => {
    if (optimizedSrc) {
      console.log(`🎯 optimizedSrc updated, ensuring loading state is active`);
      setLoading(true);
      setError(null);
    }
  }, [optimizedSrc]);

  // When compression finishes, clear any stuck loading overlay
  useEffect(() => {
    if (!fileId) return;
    // Only clear loading if compression failed and we have an error
    if (compressionStatus === "failed" && loading) {
      console.log(`⚠️ Compression failed, but keeping loading state until video loads`);
      // Don't set loading to false here - let the video loading handle it
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
    
    // For large videos, start preloading more aggressively after initial play
    if (videoRef.current && videoRef.current.duration > 300) { // 5+ minutes
      console.log(`🚀 Large video detected (${videoRef.current.duration}s), enabling aggressive preloading`);
      videoRef.current.preload = "auto";
    }

    // Record performance metrics
    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordFirstFrame(fileId);
    }

    // Check if this is the original video (might be compressing in background)
    if (
      optimizedSrc && 
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
      setError(null); // Clear any previous error
      
      // Retry optimization after a delay to check if compression completed
      setTimeout(() => {
        console.log(`🔄 Retrying video optimization during compression`);
        setRetryCounter(prev => prev + 1); // This will trigger the useEffect dependency
      }, 5000); // Retry after 5 seconds
      return;
    }

    // One-time fallback to original stream if optimized variant fails
    if (!hasTriedFallbackRef.current && optimizedSrc !== src) {
      console.warn("Optimized stream failed; falling back to original.");
      hasTriedFallbackRef.current = true;
      const fallbackUrl = `${src}${token ? `?token=${token}` : ''}`;
      setOptimizedSrc(fallbackUrl);
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

      {/* Show loading overlay when visible and loading OR when there's an error during compression */}
      {isVisible && (loading || (error && compressionStatus === "compressing")) && (
        <div className="video-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading video...</p>
            {loadingProgress > 0 && (
              <div className="loading-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{loadingProgress.toFixed(1)}% buffered</p>
              </div>
            )}
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

      {/* Show video only when visible and optimizedSrc is ready */}
      {isVisible && optimizedSrc && (
        <video
          ref={videoRef}
          src={optimizedSrc}
          controls
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
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
                     const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                     const duration = video.duration;
                     if (duration > 0) {
                       const progress = (bufferedEnd / duration) * 100;
                       setLoadingProgress(progress);
                       console.log(`📊 Buffering progress: ${progress.toFixed(1)}%`);
                     }
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
            onQualityChange={(quality: string) => {
              // Validate quality before changing
              if (quality === 'original' || compressedQualities.includes(quality)) {
                setCurrentQuality(quality);
              } else {
                console.warn(`Quality ${quality} not available, falling back to original`);
                setCurrentQuality('original');
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
