import { useState, useEffect } from 'react';

interface CompressionStatus {
  compressionStatus: 'pending' | 'compressing' | 'completed' | 'failed';
  compressedQualities: string[];
}

export const useVideoCompressionStatus = (fileId: string | undefined, token: string | undefined) => {
  const [status, setStatus] = useState<CompressionStatus>({
    compressionStatus: 'pending',
    compressedQualities: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
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
          // File not found or not a video file
          setStatus({
            compressionStatus: 'pending',
            compressedQualities: []
          });
          return;
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
  };

  useEffect(() => {
    checkStatus();
  }, [fileId, token]);

  // Poll for status updates when compressing
  useEffect(() => {
    if (status.compressionStatus === 'compressing') {
      const interval = setInterval(checkStatus, 2000); // Check every 2 seconds
      return () => clearInterval(interval);
    }
  }, [status.compressionStatus]);

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
  };
};
