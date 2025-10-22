import { useState, useEffect, useCallback } from 'react';

interface CompressionStatus {
  compressionStatus: 'pending' | 'compressing' | 'completed' | 'failed';
  compressedQualities: string[];
}

interface UseVideoCompressionStatusReturn {
  compressionStatus: string;
  compressedQualities: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  validateCompressedQualities: () => Promise<void>;
  onCompressionComplete?: () => void;
}

export const useVideoCompressionStatus = (
  fileId: string | undefined, 
  token: string | undefined,
  onCompressionComplete?: () => void
): UseVideoCompressionStatusReturn => {
  const [status, setStatus] = useState<CompressionStatus>({
    compressionStatus: 'pending',
    compressedQualities: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousStatus, setPreviousStatus] = useState<string>('pending');

  const checkStatus = useCallback(async () => {
    if (!fileId || !token) return;

    setLoading(true);
    setError(null);

    try {
      // Use the new validation endpoint
      const response = await fetch(`/api/files/${fileId}/validate-compression`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // File not found
          setStatus({
            compressionStatus: 'pending',
            compressedQualities: []
          });
          return;
        } else if (response.status === 400) {
          // Not a video file - this is expected for non-video files
          const errorData = await response.json();
          if (errorData.message?.includes('only applies to video files')) {
            setStatus({
              compressionStatus: 'pending',
              compressedQualities: []
            });
            return;
          }
        }
        throw new Error('Failed to fetch compression status');
      }

      const data = await response.json();
      
      // Update status with validated information
      setStatus({
        compressionStatus: data.actualCompressionStatus || data.compressionStatus || 'pending',
        compressedQualities: data.existingQualities || data.availableQualities || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Set fallback status on error
      setStatus({
        compressionStatus: 'failed',
        compressedQualities: []
      });
    } finally {
      setLoading(false);
    }
  }, [fileId, token]);

  useEffect(() => {
    checkStatus();
  }, [fileId, token, checkStatus]);

  // Detect when compression completes
  useEffect(() => {
    if (previousStatus === 'compressing' && status.compressionStatus === 'completed') {
      console.log('🎬 Compression completed, triggering callback');
      onCompressionComplete?.();
    }
    setPreviousStatus(status.compressionStatus);
  }, [status.compressionStatus, previousStatus, onCompressionComplete]);

  // Poll for status updates when compressing (reduced frequency)
  useEffect(() => {
    if (status.compressionStatus === 'compressing') {
      const interval = setInterval(checkStatus, 10000); // Check every 10 seconds instead of 2
      return () => clearInterval(interval);
    }
  }, [status.compressionStatus]);

  // Add timeout for compression completion detection (fallback for WebSocket)
  useEffect(() => {
    if (status.compressionStatus === 'compressing') {
      const timeout = setTimeout(() => {
        console.warn('Compression taking longer than expected, checking status...');
        checkStatus();
      }, 30000); // Check after 30 seconds if still compressing
      
      return () => clearTimeout(timeout);
    }
  }, [status.compressionStatus, checkStatus]);

  const validateCompressedQualities = async () => {
    // Verify each quality actually exists by making HEAD requests
    if (status.compressionStatus === 'completed' && status.compressedQualities.length > 0) {
      const validatedQualities: string[] = [];
      
      for (const quality of status.compressedQualities) {
        try {
          const response = await fetch(`/api/files/${fileId}/binary?quality=${quality}`, {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            validatedQualities.push(quality);
          }
        } catch (error) {
          console.warn(`Quality ${quality} validation failed:`, error);
        }
      }
      
      // Update status if some qualities are missing
      if (validatedQualities.length !== status.compressedQualities.length) {
        setStatus(prev => ({
          ...prev,
          compressedQualities: validatedQualities
        }));
      }
    }
  };

  return {
    ...status,
    loading,
    error,
    refetch: checkStatus,
    validateCompressedQualities,
    onCompressionComplete,
  };
};
