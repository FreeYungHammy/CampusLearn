import React, { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import type { TutorUpload } from "../types/tutorUploads";
import { apiBaseUrl } from "../lib/api";

interface DocxViewerProps {
  file: TutorUpload;
  token?: string;
}

const DocxViewer: React.FC<DocxViewerProps> = ({ file, token }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fileId = (file as any).id || (file as any)._id;
    if (!fileId || !viewerRef.current) return;

    const fileUrl = `${apiBaseUrl}/files/${fileId}/binary`;
    const container = viewerRef.current;

    setLoading(true);
    setError(null);

    // Include token in the request headers
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(fileUrl, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch the document.");
        }
        return response.blob();
      })
      .then((blob) => {
        renderAsync(blob, container, undefined, {
          className: "docx-content",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          debug: false,
          experimental: true,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderChanges: false,
          renderHeaders: true,
          renderFooters: true,
        })
          .then(() => {
            setLoading(false);
          })
          .catch((e) => {
            console.error("docx-preview failed:", e);
            setError("Failed to render the Word document.");
            setLoading(false);
          });
      })
      .catch((e) => {
        console.error("Fetch failed:", e);
        setError("Failed to load the Word document.");
        setLoading(false);
      });
  }, [file]);

  return (
    <div
      className="docx-viewer-container"
      style={{ height: "100%", overflowY: "auto" }}
    >
      {loading && (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading document...</p>
        </div>
      )}
      {error && (
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
        </div>
      )}
      <div ref={viewerRef} />
    </div>
  );
};

export default DocxViewer;
