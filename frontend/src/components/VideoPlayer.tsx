import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import { VideoPerformanceMonitor } from "../utils/videoPerformanceMonitor";
import VideoQualitySelector from "./VideoQualitySelector";
import { useVideoCompressionStatus } from "../hooks/useVideoCompressionStatus";
import { useAuthStore } from "../store/authStore";
import { SocketManager } from "../services/socketManager";
import "./VideoQualitySelector.css";

interface VideoPlayerProps {
  src: string;
  title: string;
  fileId?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface CompressionUpdateData {
  fileId: string;
  compressedQualities: string[];
  timestamp: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  fileId,
  className = "",
  style = {},
}) => {
  const [loading, setLoading] = useState(true); // Start as true to show overlay initially
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true); // Start as visible for immediate loading feedback
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("original");
  const hasTriedFallbackRef = useRef(false);
  const currentOptimizedSrcRef = useRef<string | null>(null);
  const optimizationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVideoPlayingRef = useRef(false);

  // Helper function to update both state and ref
  const setOptimizedSrcWithRef = (newSrc: string) => {
    setOptimizedSrc(newSrc);
    currentOptimizedSrcRef.current = newSrc;
    setIsOptimizationComplete(true); // Mark optimization as complete
  };
  





  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);

  const [recentManualChange, setRecentManualChange] = useState(false);
  const [fallbackAttempts, setFallbackAttempts] = useState(0);
  
  const token = useAuthStore((state) => state.token);
  const isVideoFile = src.includes('/binary') && (src.includes('video/') || fileId); // Basic check for video files
  
  // Reset optimization state when fileId changes (new video)
  useEffect(() => {
    setIsOptimizationComplete(false);
    setHasAutoSwitched(false);
    setRecentManualChange(false);
    setIsVideoPlaying(false); // Reset playing state for new video
    isVideoPlayingRef.current = false; // Reset ref for new video
    hasTriedFallbackRef.current = false; // Reset fallback flag for new video
    setFallbackAttempts(0); // Reset fallback attempts for new video
    
    // Clear any pending optimization timeout for new video
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
      optimizationTimeoutRef.current = null;
    }
    
    // For video files, DON'T immediately set the original source as available
    // Let the normal optimization process handle it so overlays work correctly
    if (isVideoFile) {
      console.log(`🎬 Video file detected - will optimize normally`);
    }
  }, [fileId, src, token, isVideoFile]);

  // Direct retry function that doesn't trigger useEffect loops
  const retryOptimization = useCallback(() => {
    console.log(`🔄 Direct retry of video optimization`);
    
    // Clear any existing optimization timeout before starting new optimization
    if (optimizationTimeoutRef.current) {
      console.log(`🚫 Clearing existing optimization timeout before retry`);
      clearTimeout(optimizationTimeoutRef.current);
      optimizationTimeoutRef.current = null;
    }
    
    currentOptimizedSrcRef.current = null; // Clear ref to force re-optimization
    
    // Trigger re-optimization by calling the main optimization function directly
    // This will be handled by the main useEffect, we just need to clear the ref
    console.log(`🔄 Cleared optimization ref, main useEffect will handle re-optimization`);
  }, []);

  // Seamless quality switching function that preserves video state
  const switchQualitySeamlessly = useCallback((newQuality: string) => {
    const video = videoRef.current;
    if (!video) return;

    // Store current video state
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    const playbackRate = video.playbackRate;

    console.log(`🎬 Seamlessly switching to ${newQuality} - preserving: time=${currentTime.toFixed(2)}s, playing=${wasPlaying}, rate=${playbackRate}`);
    console.log(`🔍 Debug - Setting currentQuality to: ${newQuality}`);

    // Mark this as a manual quality change to allow source updates
    isManualQualityChange.current = true;
    setRecentManualChange(true);

    // Switch quality
    setCurrentQuality(newQuality);

    // Directly update the optimized source for the new quality
    const newSrc = newQuality === 'original' 
      ? (src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`)
      : `${src.replace("/binary", "").split('?')[0]}/binary?quality=${newQuality}${token ? `&token=${token}` : ''}`;
    
    console.log(`🔗 Directly setting optimized source for ${newQuality}: ${newSrc}`);
    setOptimizedSrcWithRef(newSrc);

    // Restore state immediately after setting the source
    requestAnimationFrame(() => {
      if (video) {
        try {
          video.currentTime = currentTime;
          video.playbackRate = playbackRate;
          if (wasPlaying) {
            video.play().catch(err => console.warn('Failed to resume playback after quality switch:', err));
          }
          console.log(`✅ Seamlessly restored: time=${currentTime.toFixed(2)}s, playing=${wasPlaying}, rate=${playbackRate}`);
        } catch (err) {
          console.warn('Failed to restore video state after quality switch:', err);
        }
      }
      // Reset the manual quality change flag
      isManualQualityChange.current = false;
      setRecentManualChange(false);
    });
  }, [src, token]);


  // Handle compression completion
  const handleCompressionComplete = useCallback(() => {
    try {
      console.log('🎬 Compression completed, refreshing video qualities');
      setIsRefreshingQualities(true);
      setCompressionJustCompleted(true);
      
      // Silently refresh video qualities without notification
      
      // Only refresh immediately if user is not playing, otherwise defer
      if (!isVideoPlayingRef.current) {
        // Refresh the video source to pick up new qualities
        const refreshWithRetry = async (retries = 3) => {
          try {
            // Trigger quality optimization to pick up new compressed files
            // Directly call optimizeVideoSource instead of using retryCounter
            setTimeout(() => {
              console.log(`🔄 Refreshing video qualities after compression completion`);
              // Only refresh if user is not actively playing
              if (!isVideoPlayingRef.current) {
                retryOptimization();
              } else {
                console.log(`🚫 Skipping quality refresh - user is actively playing`);
              }
            }, 1000);
            
            // Wait a bit for the refresh to complete
            setTimeout(() => {
              setIsRefreshingQualities(false);
              setCompressionJustCompleted(false);
            }, 2000);
          } catch (error) {
            if (retries > 0) {
              console.warn(`Refresh failed, retrying... (${retries} attempts left)`);
              setTimeout(() => refreshWithRetry(retries - 1), 2000);
            } else {
              console.error('Failed to refresh video qualities after multiple attempts');
              setIsRefreshingQualities(false);
              setCompressionJustCompleted(false);
            }
          }
        };
        
        refreshWithRetry();
      } else {
        console.log('🎬 Compression completed but user is playing, deferring refresh');
        // Just update the UI state, don't refresh video source
        setTimeout(() => {
          setIsRefreshingQualities(false);
          setCompressionJustCompleted(false);
        }, 2000);
      }
    } catch {
      console.error('Error handling compression completion:');
      setIsRefreshingQualities(false);
      setCompressionJustCompleted(false);
    }
  }, [retryOptimization]);

  const { compressionStatus, compressedQualities } = useVideoCompressionStatus(
    isVideoFile ? fileId : undefined, // Only pass fileId for video files
    token || undefined,
    handleCompressionComplete // Pass the callback
  );

  // Quality selection state - show original only when compression is not completed
  const availableQualities = useMemo(() => {
    // If compression is completed and we have compressed qualities, don't show original
    if (isVideoFile && compressionStatus === 'completed' && compressedQualities && compressedQualities.length > 0) {
      return compressedQualities.map(q => ({ name: q, label: q }));
    }
    
    // Otherwise, show original quality (during compression or if no compressed qualities)
    return [{ name: 'original', label: 'Original' }];
  }, [compressionStatus, compressedQualities, isVideoFile]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasUserInitiatedPlayback = useRef<boolean>(false);
  const isManualQualityChange = useRef<boolean>(false);
  const [isRefreshingQualities, setIsRefreshingQualities] = useState(false);
  const [compressionJustCompleted, setCompressionJustCompleted] = useState(false);
  const [videoDimensions, setVideoDimensions] = useState<{width: number, height: number} | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);


  // Update current quality when available qualities change
  useEffect(() => {
    if (compressionStatus === 'completed' && currentQuality === 'original' && compressedQualities.length > 0 && !hasAutoSwitched && !hasUserInitiatedPlayback.current) {
      const newQuality = compressedQualities[0];
      console.log(`✅ Compression complete. Automatically switching from original to ${newQuality}`);
      setHasAutoSwitched(true);
      switchQualitySeamlessly(newQuality);
    }
  }, [compressionStatus, currentQuality, compressedQualities, hasAutoSwitched, switchQualitySeamlessly, isVideoPlaying]);

  // WebSocket listener for compression updates - only for video files
  useEffect(() => {
    if (!fileId || !isVideoFile) return;

    const handleCompressionUpdate = (data: CompressionUpdateData) => {
      if (data.fileId === fileId) {
        console.log('🎬 Received compression update via WebSocket:', data);
        handleCompressionComplete();
      }
    };

    // Get the global socket from SocketManager
    const socket = SocketManager.getSocket();
    if (socket) {
      socket.on('video-compression-update', handleCompressionUpdate);
      
      return () => {
        socket.off('video-compression-update', handleCompressionUpdate);
      };
    }
  }, [fileId, isVideoFile, handleCompressionComplete]);

  // Reset auto-switch flag when video changes
  useEffect(() => {
    setHasAutoSwitched(false);
  }, [fileId]);

  // Log when optimizedSrc changes (reduced logging)
  useEffect(() => {
    if (optimizedSrc) {
      console.log(`🔄 Video source ready:`, optimizedSrc.substring(0, 100) + '...');
    }
  }, [optimizedSrc]);

  // Calculate optimal video dimensions based on container and aspect ratio


  // Detect connection speed and optimize video source with graceful fallback
  useEffect(() => {
    const optimizeVideoSource = async () => {
      try {
        // Don't optimize if user is actively playing - this prevents resets
        if (isVideoPlayingRef.current) {
          console.log(`🚫 Skipping optimization - user is actively playing`);
          return;
        }

        // Don't optimize if a manual quality change just happened - seamless switching already handled it
        if (recentManualChange) {
          console.log(`🚫 Skipping optimization - recent manual quality change, seamless switching already handled it`);
          return;
        }

        // For video files, if we're on original quality and compression is in progress,
        // don't run optimization - let the original video play
        if (isVideoFile && currentQuality === 'original' && compressionStatus === 'compressing') {
          console.log(`🎬 Video compression in progress - keeping original quality, skipping optimization`);
          return;
        }

        // Don't optimize if we already have the correct source for the current quality
        if (currentOptimizedSrcRef.current) {
          if (currentQuality === 'original' && !currentOptimizedSrcRef.current.includes('quality=')) {
            console.log(`🎬 Already have optimized source for ${currentQuality}, skipping optimization`);
            setIsOptimizationComplete(true); // Mark as complete since we're using existing source
            return;
          } else if (currentQuality !== 'original' && currentOptimizedSrcRef.current.includes(`quality=${currentQuality}`)) {
            console.log(`🎬 Already have optimized source for ${currentQuality}, skipping optimization`);
            setIsOptimizationComplete(true); // Mark as complete since we're using existing source
            return;
          }
        }
        
        console.log(`🎬 VideoPlayer: Starting optimization for ${title}`);
        
        // Clear any existing optimization timeout before starting new optimization
        if (optimizationTimeoutRef.current) {
          console.log(`🚫 Clearing existing optimization timeout before starting new optimization`);
          clearTimeout(optimizationTimeoutRef.current);
          optimizationTimeoutRef.current = null;
        }
        
        // Reset optimization complete flag when starting new optimization
        setIsOptimizationComplete(false);
        
        // Set loading state immediately when starting optimization
        setLoading(true);
        setError(null);
        
        // Set a timeout to fallback to original source if optimization takes too long
        optimizationTimeoutRef.current = setTimeout(() => {
          // Don't execute timeout if user is actively playing
          if (isVideoPlaying) {
            console.log(`🚫 Skipping optimization timeout - user is actively playing`);
            return;
          }
          console.log(`⏰ Video optimization timeout, using original source`);
          if (!isVideoPlayingRef.current) {
            setOptimizedSrcWithRef(src);
          }
          setLoading(false);
        }, 5000); // 5 second timeout

        const selectedQuality = currentQuality;
        console.log(`🎯 Selected quality: ${selectedQuality}`);
        console.log(`🔍 Debug - currentQuality state: ${currentQuality}`);

        // Start performance tracking
        if (fileId) {
          const performanceMonitor = VideoPerformanceMonitor.getInstance();
          performanceMonitor.startTracking(fileId, selectedQuality, "manual");
        }

        if (fileId) {
          let candidateUrl: string;
          
          if (selectedQuality === 'original') {
            // Use original URL - check if it already has a token
            if (src.includes('?token=')) {
              candidateUrl = src; // URL already has token
            } else {
            candidateUrl = `${src}${token ? `?token=${token}` : ''}`;
            }
          } else {
            // Use compressed quality URL
            const baseUrl = src.replace("/binary", "");
            // Remove existing token from baseUrl if present
            const cleanBaseUrl = baseUrl.split('?')[0];
            candidateUrl = `${cleanBaseUrl}/binary?quality=${selectedQuality}${token ? `&token=${token}` : ''}`;
          }
          
          console.log(`🔗 Optimizing video URL for quality: ${selectedQuality}`);

          try {
            const headResp = await fetch(candidateUrl, {
              method: "HEAD",
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              redirect: "manual", // avoid following to cross-origin (e.g., GCS) which can CORS-fail
            });
            // Treat redirects as unavailable rendition
            if (headResp.type === "opaqueredirect" || (headResp.status >= 300 && headResp.status < 400)) {
              console.warn("Optimized URL redirected cross-origin; using original.");
              const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
              if (!isVideoPlayingRef.current) {
                setOptimizedSrcWithRef(fallbackUrl);
              }
              return;
            }
            if (headResp.ok) {
              const contentType = headResp.headers.get("content-type") || "";
              console.log(`✅ HEAD request successful, content-type: ${contentType}`);
              if (contentType.includes("video") || contentType === "application/octet-stream") {
                console.log(`🎯 Setting optimizedSrc to: ${candidateUrl}`);
                if (optimizationTimeoutRef.current) {
                  clearTimeout(optimizationTimeoutRef.current);
                  optimizationTimeoutRef.current = null;
                }
                if (!isVideoPlayingRef.current) {
                  setOptimizedSrcWithRef(candidateUrl);
                }
              } else {
                console.warn("HEAD non-video content-type; using original.", contentType);
                const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
                console.log(`🔄 Setting optimizedSrc to fallback: ${fallbackUrl}`);
                if (optimizationTimeoutRef.current) {
                  clearTimeout(optimizationTimeoutRef.current);
                  optimizationTimeoutRef.current = null;
                }
                setOptimizedSrcWithRef(fallbackUrl);
              }
            } else if (headResp.status === 202) {
              console.log(`⏳ Video is being processed (202 Accepted), will retry in a moment`);
              // Keep loading state active and retry after a delay
              setTimeout(() => {
                console.log(`🔄 Retrying video optimization after processing delay`);
                retryOptimization();
              }, 10000); // Retry after 10 seconds instead of 3
              return; // Exit early to prevent fallback
            } else {
              console.warn(`HEAD ${headResp.status} for optimized; using original.`);
              const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
              console.log(`🔄 Setting optimizedSrc to fallback: ${fallbackUrl}`);
              console.log(`🔑 Token for fallback:`, token ? 'present' : 'missing');
              if (optimizationTimeoutRef.current) {
                clearTimeout(optimizationTimeoutRef.current);
                optimizationTimeoutRef.current = null;
              }
              setOptimizedSrcWithRef(fallbackUrl);
            }
          } catch (e) {
            console.warn("HEAD request failed; using original.", e);
            const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
            console.log(`🔄 Setting optimizedSrc to fallback (catch): ${fallbackUrl}`);
            if (optimizationTimeoutRef.current) {
              clearTimeout(optimizationTimeoutRef.current);
              optimizationTimeoutRef.current = null;
            }
            setOptimizedSrcWithRef(fallbackUrl);
          }
        } else {
          console.log(`📺 No fileId available, using original URL`);
          const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
          console.log(`🔄 Setting optimizedSrc to fallback (no fileId): ${fallbackUrl}`);
          if (optimizationTimeoutRef.current) {
            clearTimeout(optimizationTimeoutRef.current);
            optimizationTimeoutRef.current = null;
          }
          setOptimizedSrcWithRef(fallbackUrl);
        }
      } catch (error) {
        console.warn("❌ Failed to optimize video source:", error);
        const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
        console.log(`🔄 Setting optimizedSrc to fallback (main catch): ${fallbackUrl}`);
        setOptimizedSrcWithRef(fallbackUrl);
      }
    };

    hasTriedFallbackRef.current = false;
    optimizeVideoSource();
  }, [src, fileId, title, currentQuality, token, recentManualChange, isVideoFile, compressionStatus]);

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
    // Don't set isVideoPlaying here - this just means video is ready to play, not actually playing
    console.log(`🎯 Overlay should now be hidden - video is ready to play`);
    
    // Enable aggressive preloading for large videos
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
    if (!isOptimizationComplete) {
      console.log(`🚫 Video click ignored - optimization not complete`);
      return;
    }
    console.log(`👆 User clicked video`);
  };

  const handleVideoPlay = () => {
    if (!isOptimizationComplete) {
      console.log(`🚫 Video play ignored - optimization not complete`);
      return;
    }
    console.log(`▶️ User started playing video`);
    hasUserInitiatedPlayback.current = true;
    
    // Clear any pending optimization timeout IMMEDIATELY when user starts playing
    // This prevents the timeout from switching sources while user is playing
    if (optimizationTimeoutRef.current) {
      console.log(`🚫 User started playing - clearing optimization timeout`);
      clearTimeout(optimizationTimeoutRef.current);
      optimizationTimeoutRef.current = null;
    }
    
    // Update both state and ref immediately
    setIsVideoPlaying(true);
    isVideoPlayingRef.current = true;
  };

  const handleVideoPause = () => {
    if (!isOptimizationComplete) {
      console.log(`🚫 Video pause ignored - optimization not complete`);
      return;
    }
    console.log(`⏸️ User paused video`);
    // Reset isVideoPlaying to false when user pauses to allow optimization
    // This enables quality changes and optimization when user is not actively playing
    setIsVideoPlaying(false);
    isVideoPlayingRef.current = false;
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
        retryOptimization();
      }, 15000); // Retry after 15 seconds instead of 5
      return;
    }

    // Smart fallback strategy: try compressed qualities if original fails
    if (fallbackAttempts < 3) { // Allow up to 3 fallback attempts
      console.warn(`Video failed to load, trying smart fallback strategy (attempt ${fallbackAttempts + 1}/3)`);
      setFallbackAttempts(prev => prev + 1);
      
      // If we're currently on original and have compressed qualities, try them
      if (currentQuality === 'original' && compressedQualities && compressedQualities.length > 0) {
        const qualityToTry = compressedQualities[fallbackAttempts] || compressedQualities[0];
        console.log(`🔄 Original failed, trying compressed quality: ${qualityToTry}`);
        const compressedUrl = `${src.replace("/binary", "").split('?')[0]}/binary?quality=${qualityToTry}${token ? `&token=${token}` : ''}`;
        setOptimizedSrcWithRef(compressedUrl);
        // Don't change currentQuality - just change the source
        setError(null);
        setLoading(true);
        
        // Preserve video state
        if (videoRef.current) {
          const v = videoRef.current;
          const currentTime = v.currentTime || 0;
          const wasPlaying = !v.paused;
          
          console.log(`🔄 Fallback to compressed: preserving time=${currentTime.toFixed(2)}s, playing=${wasPlaying}`);
          
          requestAnimationFrame(() => {
            try {
              v.currentTime = currentTime;
              if (wasPlaying) {
                v.play().catch(err => console.warn('Failed to resume playback after fallback:', err));
              }
            } catch (err) {
              console.warn('Failed to restore video state after fallback:', err);
            }
          });
        }
        return;
      }
      
      // If we're on a compressed quality and it fails, try another compressed quality or original
      if (currentQuality !== 'original') {
        if (compressedQualities && compressedQualities.length > 1) {
          // Try another compressed quality
          const otherQualities = compressedQualities.filter(q => q !== currentQuality);
          if (otherQualities.length > 0) {
            const qualityToTry = otherQualities[0];
            console.log(`🔄 Compressed quality ${currentQuality} failed, trying: ${qualityToTry}`);
            const compressedUrl = `${src.replace("/binary", "").split('?')[0]}/binary?quality=${qualityToTry}${token ? `&token=${token}` : ''}`;
            setOptimizedSrcWithRef(compressedUrl);
            // Don't change currentQuality - just change the source
            setError(null);
            setLoading(true);
            
            if (videoRef.current) {
              const v = videoRef.current;
              const currentTime = v.currentTime || 0;
              const wasPlaying = !v.paused;
              
              console.log(`🔄 Fallback to another compressed: preserving time=${currentTime.toFixed(2)}s, playing=${wasPlaying}`);
              
              requestAnimationFrame(() => {
                try {
                  v.currentTime = currentTime;
                  if (wasPlaying) {
                    v.play().catch(err => console.warn('Failed to resume playback after fallback:', err));
                  }
                } catch (err) {
                  console.warn('Failed to restore video state after fallback:', err);
                }
              });
            }
            return;
          }
        }
        
        // Try original as last resort
        console.warn("All compressed qualities failed; falling back to original.");
        const fallbackUrl = src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`;
        setOptimizedSrcWithRef(fallbackUrl);
        // Don't change currentQuality - just change the source
        setError(null);
        setLoading(true);
        
        if (videoRef.current) {
          const v = videoRef.current;
          const currentTime = v.currentTime || 0;
          const wasPlaying = !v.paused;
          
          console.log(`🔄 Fallback to original: preserving time=${currentTime.toFixed(2)}s, playing=${wasPlaying}`);
          
          requestAnimationFrame(() => {
            try {
              v.currentTime = currentTime;
              if (wasPlaying) {
                v.play().catch(err => console.warn('Failed to resume playback after fallback:', err));
              }
            } catch (err) {
              console.warn('Failed to restore video state after fallback:', err);
            }
          });
        }
        return;
      }
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

      {/* COMPRESSION OVERLAY REMOVED */}



      {/* Show loading overlay when visible and loading OR when there's an error during compression OR when optimization is not complete */}
      {isVisible && (loading || (error && compressionStatus === "compressing") || !isOptimizationComplete) && (
        <div className="video-loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{!isOptimizationComplete ? 'Preparing video...' : 'Loading video...'}</p>
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

      {/* ERROR OVERLAY COMPLETELY REMOVED */}

      {/* Show video - use original src as fallback if optimizedSrc is not ready */}
      {isVisible && (
        <video
          ref={videoRef}
          src={optimizedSrc || src}
          controls={isOptimizationComplete || (isVideoFile && optimizedSrc && !optimizedSrc.includes('quality=')) || false}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
                 onLoadStart={handleLoadStart}
                 onCanPlay={handleCanPlay}
                 onError={handleError}
                 onClick={handleVideoClick}
                 onPlay={handleVideoPlay}
                 onPause={handleVideoPause}
                 onEnded={() => {
                   console.log(`🏁 Video ended`);
                   setIsVideoPlaying(false); // Reset playing state when video ends
                   isVideoPlayingRef.current = false;
                 }}
                 onLoad={() => {
                   console.log("🎬 Video loaded successfully");
                 }}
                 onLoadedData={() => {
                   console.log("📊 Video data loaded");
                 }}
                 onLoadedMetadata={(e) => {
                   const video = e.target as HTMLVideoElement;
                   if (video.videoWidth && video.videoHeight) {
                     setVideoDimensions({
                       width: video.videoWidth,
                       height: video.videoHeight
                     });
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
                console.log(`🔄 Manual quality change: ${currentQuality} → ${quality}`);
                switchQualitySeamlessly(quality);
              } else {
                console.warn(`Quality ${quality} not available, falling back to original`);
                switchQualitySeamlessly('original');
              }
            }}
          />
          {/* Show compression status indicator - only for video files */}
          {isVideoFile && compressionStatus === 'compressing' && (
            <div className="compression-status-indicator">
              <div className="spinner-small"></div>
              <span>Compressing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
