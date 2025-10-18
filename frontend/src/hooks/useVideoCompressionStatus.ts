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
      const response = await fetch(`/api/videos/${fileId}/compression-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch compression status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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

  return {
    ...status,
    loading,
    error,
    refetch: checkStatus,
  };
};
