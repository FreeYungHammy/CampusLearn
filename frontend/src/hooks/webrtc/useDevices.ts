import { useEffect, useState, useCallback } from "react";

export function useDevices() {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First request permissions to get device labels
      try {
        await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: true 
        });
      } catch (permError) {
        console.warn('Permission request failed, but continuing with device enumeration:', permError);
      }
      
      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('[useDevices] All devices:', devices);
      
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      const audioDevices = devices.filter((d) => d.kind === "audioinput");
      
      console.log('[useDevices] Video devices:', videoDevices);
      console.log('[useDevices] Audio devices:', audioDevices);
      
      setCameras(videoDevices);
      setMics(audioDevices);
      
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        setError('No camera or microphone devices found');
      }
    } catch (err) {
      console.error('[useDevices] Failed to enumerate devices:', err);
      setError('Failed to access camera and microphone devices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('[useDevices] Device change detected, refreshing...');
      refreshDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [refreshDevices]);

  return { cameras, mics, isLoading, error, refreshDevices };
}


