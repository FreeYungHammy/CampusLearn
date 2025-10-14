import React, { useEffect, useRef, useState } from "react";
import { useDevices } from "../../hooks/webrtc/useDevices";

type Props = {
  onConfirm: (sel: { audioDeviceId?: string; videoDeviceId?: string }) => void;
  onCancel: () => void;
};

export const PreJoinPanel: React.FC<Props> = ({ onConfirm, onCancel }) => {
  const { cameras, mics } = useDevices();
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [videoDeviceId, setVideoDeviceId] = useState<string | undefined>();
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
        if (previewRef.current) previewRef.current.srcObject = stream;
      } catch (e: any) {
        setError(e?.message || "Unable to access camera");
      }
    })();
    return () => {
      const s = previewRef.current?.srcObject as MediaStream | undefined;
      s?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="cl-prejoin">
      <div className="cl-pre-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video ref={previewRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} />
      </div>
      <div className="cl-pre-card cl-pre-form">
        <h3 style={{ marginTop: 0, marginBottom: 8, color: "#e5e7eb" }}>Choose your devices</h3>
        <label>Microphone</label>
        <select value={audioDeviceId} onChange={(e) => setAudioDeviceId(e.target.value || undefined)}>
          <option value="">Default</option>
          {mics.map((m) => (
            <option key={m.deviceId} value={m.deviceId}>{m.label || m.deviceId}</option>
          ))}
        </select>
        <label>Camera</label>
        <select value={videoDeviceId} onChange={(e) => setVideoDeviceId(e.target.value || undefined)}>
          <option value="">Default</option>
          {cameras.map((c) => (
            <option key={c.deviceId} value={c.deviceId}>{c.label || c.deviceId}</option>
          ))}
        </select>
        <div className="cl-pre-actions">
          <button onClick={() => onCancel()} className="cl-pre-cancel">Cancel</button>
          <button onClick={() => onConfirm({ audioDeviceId, videoDeviceId })} className="cl-pre-join">Join</button>
        </div>
        {error && <div style={{ color: "#fda4af", marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
};


