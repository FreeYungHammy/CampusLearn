import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { VideoCallPanel } from "../../components/video-call/VideoCallPanel";
import { CallControls } from "../../components/video-call/CallControls";
import { PreJoinPanel } from "../../components/video-call/PreJoinPanel";
import "../../components/video-call/call.css";
import { usePeerConnection } from "../../hooks/webrtc/usePeerConnection";
import { useVideoSignaling } from "../../hooks/webrtc/useVideoSignaling";
import { useAuthStore } from "../../store/authStore";

export const VideoCallPage: React.FC = () => {
  const { callId } = useParams();
  const { token, user } = useAuthStore();
  const pc = usePeerConnection();
  const signaling = useVideoSignaling(callId, token || undefined);
  const [error, setError] = useState<string | null>(null);
  const [prejoinDone, setPrejoinDone] = useState(false);
  const [pendingInit, setPendingInit] = useState<{ audioDeviceId?: string; videoDeviceId?: string } | null>(null);

  useEffect(() => {
    document.title = `Call • ${callId ?? "Unknown"}`;
  }, [callId]);

  // initialize PC and bind signaling after prejoin selection
  useEffect(() => {
    (async () => {
      if (!prejoinDone || !pendingInit) return;
      try {
        await pc.init(pendingInit);

        // outbound ICE
        if (pc.pcRef.current) {
          pc.pcRef.current.onicecandidate = (e) => {
            if (e.candidate) {
              console.log("[webrtc] local ice-candidate", e.candidate.type, e.candidate.protocol);
              signaling.sendSignal({ type: "ice-candidate", candidate: e.candidate.toJSON() });
            }
          };
          pc.pcRef.current.onconnectionstatechange = () => {
            console.log("[webrtc] connection state:", pc.pcRef.current?.connectionState);
          };
        }

        // inbound signaling
        signaling.onSignal(async ({ data }) => {
          console.log("[signal] received", data?.type);
          if (!data?.type) return;
          if (data.type === "offer") {
            await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
            const answer = await pc.createAnswer();
            signaling.sendSignal({ type: "answer", sdp: answer.sdp });
          } else if (data.type === "answer") {
            await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
          } else if (data.type === "ice-candidate" && data.candidate) {
            await pc.addIceCandidate(data.candidate);
          }
        });

        // join room
        const role = user?.role === "tutor" || user?.role === "student" ? (user.role as any) : "guest";
        signaling.join(role);

        // Determine initiator from callId (sorted id1:id2 -> id1 initiates)
        const parts = (callId || "").split(":");
        const initiator = parts.length === 2 && user?.id === parts[0];
        console.log("[webrtc] initiator?", initiator, "parts=", parts, "user=", user?.id);
        if (initiator) {
          // create offer after join
          setTimeout(async () => {
            try {
              const offer = await pc.createOffer();
              console.log("[webrtc] sending offer");
              signaling.sendSignal({ type: "offer", sdp: offer.sdp });
            } catch (e) {
              console.warn("[webrtc] failed to create offer", e);
            }
          }, 200);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to initialize call");
      }
    })();
    return () => signaling.leave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, token, prejoinDone, pendingInit]);

  // Placeholder shell; hooks/components will be wired next
  return (
    <div className="cl-call-root">
      <header className="cl-call-header">
        <div>CampusLearn • Call</div>
        <div style={{ opacity: 0.7 }}>{callId}</div>
      </header>
      <main className="cl-stage">
        {!prejoinDone ? (
          <PreJoinPanel
            onCancel={() => window.close()}
            onConfirm={(sel) => {
              setPendingInit(sel);
              setPrejoinDone(true);
            }}
          />
        ) : (
          <>
            <VideoCallPanel localStream={pc.localStream} remoteStream={pc.remoteStream} />
            <div style={{ position: "absolute", left: 16, bottom: 16, backdropFilter: "blur(6px)", background: "rgba(255,255,255,0.08)", padding: "8px 10px", borderRadius: 8, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: "50%", 
                  backgroundColor: pc.connectionQuality.status === 'excellent' ? '#10b981' : 
                                 pc.connectionQuality.status === 'good' ? '#3b82f6' :
                                 pc.connectionQuality.status === 'fair' ? '#f59e0b' : '#ef4444'
                }} />
                <span style={{ fontWeight: 500 }}>{pc.connectionQuality.details}</span>
                {pc.isReconnecting && (
                  <span style={{ color: '#f59e0b', fontSize: 10 }}>🔄 Reconnecting...</span>
                )}
              </div>
              <div>Signaling: {pc.pcState}</div>
              <div>ICE Conn: {pc.iceConnState}</div>
              <div>ICE Gather: {pc.iceGatherState}</div>
              {pc.reconnectAttempts > 0 && (
                <div style={{ color: '#f59e0b' }}>Reconnect attempts: {pc.reconnectAttempts}/3</div>
              )}
            </div>
            <CallControls
              onToggleMic={() => pc.toggleMic()}
              onToggleCam={() => pc.toggleCam()}
              onToggleScreenshare={() => pc.toggleScreenShare()}
              onLeave={() => window.close()}
              onReconnect={() => pc.attemptReconnection()}
              micOn={pc.audioEnabled}
              camOn={pc.videoEnabled}
              sharing={pc.isScreenSharing}
              isReconnecting={pc.isReconnecting}
            />
          </>
        )}
      </main>
      {error && (
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "#e74c3c", color: "#fff", padding: "8px 12px", borderRadius: 6 }}>{error}</div>
      )}
    </div>
  );
};


