import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import { VideoPerformanceMonitor } from "../utils/videoPerformanceMonitor";
import VideoQualitySelector from "./VideoQualitySelector";
import { useVideoCompressionStatus } from "../hooks/useVideoCompressionStatus";
import { useAuthStore } from "../store/authStore";
import { SocketManager } from "../services/socketManager";
import "./VideoQualitySelector.css";
import "./VideoPlayer.css";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [currentQuality, setCurrentQuality] = useState<string>("original");
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  const [isOptimizationComplete, setIsOptimizationComplete] = useState(false);
  const [recentManualChange, setRecentManualChange] = useState(false);

  const hasTriedFallbackRef = useRef(false);
  const currentOptimizedSrcRef = useRef<string | null>(null);
  const optimizationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isVideoPlayingRef = useRef(false);
  const hasUserInitiatedPlayback = useRef<boolean>(false);
  const isManualQualityChange = useRef<boolean>(false);
  const fallbackAttemptsRef = useRef<number>(0);

  const token = useAuthStore((state) => state.token);
  const isVideoFile = src.includes('/binary') && (src.includes('video/') || fileId);

  // Helper function to update both state and ref
  const setOptimizedSrcWithRef = (newSrc: string) => {
    setOptimizedSrc(newSrc);
    currentOptimizedSrcRef.current = newSrc;
    setIsOptimizationComplete(true);
  };

  // Reset optimization state when fileId changes (new video)
  useEffect(() => {
    isVideoPlayingRef.current = false;
    hasTriedFallbackRef.current = false;
    fallbackAttemptsRef.current = 0;
    
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
      optimizationTimeoutRef.current = null;
    }
    
    console.log(`🎬 VideoPlayer: Starting optimization for ${title}`);
  }, [src, fileId, title]);

  // Seamless quality switching function
  const switchQualitySeamlessly = useCallback((newQuality: string) => {
    const video = videoRef.current;
    if (!video) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    const playbackRate = video.playbackRate;

    console.log(`🎬 Seamlessly switching to ${newQuality} - preserving: time=${currentTime.toFixed(2)}s, playing=${wasPlaying}, rate=${playbackRate}`);

    isManualQualityChange.current = true;
    setRecentManualChange(true);
    setCurrentQuality(newQuality);

    const newSrc = newQuality === 'original' 
      ? (src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`)
      : `${src.replace("/binary", "").split('?')[0]}/binary?quality=${newQuality}${token ? `&token=${token}` : ''}`;
    
    console.log(`🔗 Directly setting optimized source for ${newQuality}: ${newSrc}`);
    setOptimizedSrcWithRef(newSrc);

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
      isManualQualityChange.current = false;
      setRecentManualChange(false);
    });
  }, [src, token]);

  // Handle compression completion
  const handleCompressionComplete = useCallback(() => {
    try {
      console.log('🎬 Compression completed, refreshing video qualities');
      
      if (!isVideoPlayingRef.current) {
        const refreshWithRetry = (retries = 3) => {
          try {
            console.log(`🔄 Refreshing video qualities... (${retries} attempts left)`);
            
            setTimeout(() => {
              if (!isVideoPlayingRef.current) {
                console.log(`✅ Video qualities refreshed successfully`);
              } else {
                console.log(`🚫 Skipping quality refresh - user is actively playing`);
              }
            }, 1000);
            
            setTimeout(() => {
              // Refresh completed
            }, 2000);
          } catch {
            if (retries > 0) {
              console.warn(`Refresh failed, retrying... (${retries} attempts left)`);
              setTimeout(() => refreshWithRetry(retries - 1), 2000);
            } else {
              console.error('Failed to refresh video qualities after multiple attempts');
            }
          }
        };
        
        refreshWithRetry();
      } else {
        console.log('🎬 Compression completed but user is playing, deferring refresh');
        setTimeout(() => {
          // Compression completed successfully
        }, 2000);
      }
    } catch {
      console.error('Error handling compression completion');
    }
  }, []);

  const { compressionStatus, compressedQualities } = useVideoCompressionStatus(
    isVideoFile ? fileId : undefined,
    token || undefined,
  );

  // Get available qualities for the quality selector
  const availableQualities = useMemo(() => {
    if (!isVideoFile) return [];

    if (compressionStatus === 'completed' && compressedQualities.length > 0) {
      return [
        { name: 'original', label: 'Original' },
        ...compressedQualities.map(quality => ({
          name: quality,
          label: quality.charAt(0).toUpperCase() + quality.slice(1)
        }))
      ];
    }

    return [{ name: 'original', label: 'Original' }];
  }, [compressionStatus, compressedQualities, isVideoFile]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update current quality when available qualities change
  useEffect(() => {
    if (compressionStatus === 'completed' && currentQuality === 'original' && compressedQualities.length > 0 && !hasAutoSwitched && !hasUserInitiatedPlayback.current) {
      const newQuality = compressedQualities[0];
      console.log(`✅ Compression complete. Automatically switching from original to ${newQuality}`);
      setTimeout(() => setHasAutoSwitched(true), 0);
      switchQualitySeamlessly(newQuality);
    }
  }, [compressionStatus, currentQuality, compressedQualities, hasAutoSwitched, switchQualitySeamlessly, isVideoPlaying]);

  // WebSocket listener for compression updates
  useEffect(() => {
    if (fileId && isVideoFile) {
      const socket = SocketManager.getSocket();
      if (socket) {
        const handleCompressionUpdate = (data: CompressionUpdateData) => {
          if (data.fileId === fileId) {
            console.log('🎬 Received compression update:', data);
            handleCompressionComplete();
          }
        };

        socket.on('video-compression-update', handleCompressionUpdate);
        return () => {
          socket.off('video-compression-update', handleCompressionUpdate);
        };
      }
    }
  }, [fileId, isVideoFile, handleCompressionComplete]);

  // Reset auto-switch flag when video changes
  useEffect(() => {
    setTimeout(() => setHasAutoSwitched(false), 0);
  }, [fileId]);

  // Log when optimizedSrc changes
  useEffect(() => {
    if (optimizedSrc) {
      console.log(`🔄 Video source ready:`, optimizedSrc.substring(0, 100) + '...');
    }
  }, [optimizedSrc]);

  // Main optimization effect
  useEffect(() => {
    if (!fileId || !isVideoFile) {
      console.log(`🎯 Non-video file, using direct URL: ${src}`);
      setOptimizedSrcWithRef(src);
      return;
    }

    console.log(`🎯 Selected quality: ${currentQuality}`);
    console.log(`🔍 Debug - currentQuality state: ${currentQuality}`);

    const optimizeVideoSource = async () => {
      try {
        console.log(`🔗 Optimizing video URL for quality: ${currentQuality}`);
        
        const url = currentQuality === 'original' 
          ? (src.includes('?token=') ? src : `${src}${token ? `?token=${token}` : ''}`)
          : `${src.replace("/binary", "").split('?')[0]}/binary?quality=${currentQuality}${token ? `&token=${token}` : ''}`;

        console.log(`🎬 Video loading started for: ${title}`);

        // Test the URL with a HEAD request
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          console.log(`✅ HEAD request successful, content-type: ${contentType}`);
          console.log(`🎯 Setting optimizedSrc to: ${url}`);
          setOptimizedSrcWithRef(url);
        } else {
          throw new Error(`HEAD request failed: ${response.status}`);
        }
      } catch (err) {
        console.error(`❌ Error optimizing video source:`, err);
        setError(`Failed to load video: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    hasTriedFallbackRef.current = false;
    optimizeVideoSource();
  }, [src, fileId, title, currentQuality, token, recentManualChange, isVideoFile, compressionStatus, isVideoPlaying, optimizedSrc]);

  // When optimizedSrc changes, ensure loading state is properly managed
  useEffect(() => {
    if (optimizedSrc) {
      console.log(`🎯 optimizedSrc updated, optimization should be complete`);
      setTimeout(() => {
        setLoading(false);
        setError(null);
        setIsOptimizationComplete(true);
      }, 0);
    }
  }, [optimizedSrc]);

  // Fallback mechanism to ensure optimization completes
  useEffect(() => {
    if (optimizedSrc && !isOptimizationComplete) {
      const fallbackTimeout = setTimeout(() => {
        console.log(`🚨 Fallback: Forcing optimization completion after 10 seconds`);
        setIsOptimizationComplete(true);
        setLoading(false);
      }, 10000);
      return () => clearTimeout(fallbackTimeout);
    }
  }, [optimizedSrc, isOptimizationComplete]);

  // When compression finishes, clear any stuck loading overlay
  useEffect(() => {
    if (!fileId) return;
    if (compressionStatus === "failed" && loading) {
      console.log(`⚠️ Compression failed, but keeping loading state until video loads`);
    }
  }, [compressionStatus, loading, fileId]);

  const handleCanPlay = () => {
    console.log(`✅ Video can play for: ${title}`);
    setLoading(false);
    setIsOptimizationComplete(true);
    console.log(`🎯 Overlay should now be hidden - video is ready to play`);
    
    if (videoRef.current && videoRef.current.duration > 300) {
      console.log(`🚀 Large video detected (${videoRef.current.duration}s), enabling aggressive preloading`);
    }

    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordFirstFrame(fileId);
    }
  };

  const handlePlay = () => {
    console.log(`▶️ Video started playing: ${title}`);
    setIsVideoPlaying(true);
    isVideoPlayingRef.current = true;
    hasUserInitiatedPlayback.current = true;
    
    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordFirstFrame(fileId);
    }
  };

  const handlePause = () => {
    console.log(`⏸️ Video paused: ${title}`);
    setIsVideoPlaying(false);
    isVideoPlayingRef.current = false;
  };

  const handleLoadStart = () => {
    console.log(`🔄 Video load started: ${title}`);
    setLoading(true);
    setError(null);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error(`❌ Video error for ${title}:`, e);
    setLoading(false);
    setError('Failed to load video');
    
    if (fileId) {
      const performanceMonitor = VideoPerformanceMonitor.getInstance();
      performanceMonitor.recordError(fileId, "Video loading failed");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`video-player-container ${className}`}
      style={{ 
        position: "relative", 
        ...style 
      }}
    >
      <video
        ref={videoRef}
        src={optimizedSrc || src}
        controls
        preload="metadata"
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onPause={handlePause}
        onLoadStart={handleLoadStart}
        onError={handleError}
        onLoadedData={() => {
          console.log("📊 Video data loaded");
        }}
        onLoadedMetadata={(e) => {
          const video = e.target as HTMLVideoElement;
          if (video.videoWidth && video.videoHeight) {
            // Video dimensions loaded
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
          height: "100%",
          display: "block",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          margin: "0 auto",
        }}
      />

      {/* Show loading overlay when loading OR when there's an error during compression */}
      {(loading || (error && compressionStatus === "compressing")) && (
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
                <span>{Math.round(loadingProgress)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="video-error-overlay">
          <div className="error-content">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Quality selector for video files */}
      {isVideoFile && availableQualities.length > 1 && (
        <div className="video-quality-controls">
          <VideoQualitySelector
            availableQualities={availableQualities}
            currentQuality={currentQuality}
            onQualityChange={switchQualitySeamlessly}
            className="video-quality-selector"
          />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;