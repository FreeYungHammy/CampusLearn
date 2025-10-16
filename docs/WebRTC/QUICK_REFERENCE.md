# WebRTC Quick Reference Guide

**Quick cheat sheet for WebRTC implementation**

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install @socket.io/redis-adapter@^8.3.0

# Frontend (if not already installed)
cd frontend
npm install socket.io-client@^8.3.0
```

### 2. Environment Variables
```env
# TURN/STUN Configuration
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:relay1.metered.ca:80
TURN_USERNAME=<your-metered-username>
TURN_CREDENTIAL=<your-metered-password>
```

### 3. Test TURN Server
Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

---

## 📁 File Structure

```
backend/src/
├── schemas/
│   ├── call.schema.ts
│   └── callParticipant.schema.ts
├── realtime/
│   ├── signaling.service.ts
│   ├── presence.service.ts
│   ├── call.service.ts
│   └── iceConfig.ts
└── config/
    └── socket.ts (updated)

frontend/src/
├── hooks/webrtc/
│   ├── usePeerConnection.ts
│   ├── useDevices.ts
│   └── useVideoSignaling.ts
└── components/video-call/
    ├── VideoCallPanel.tsx
    ├── CallControls.tsx
    └── CallHealth.tsx
```

---

## 🔌 Socket.IO Events

### Client → Server
```typescript
// Join call
socket.emit('join_call', { callId, userId, token })

// Send signal
socket.emit('signal', { callId, toUserId, data })

// Leave call
socket.emit('leave_call', { callId, userId })
```

### Server → Client
```typescript
socket.on('peer_joined', { userId, callId })
socket.on('signal', { fromUserId, data })
socket.on('peer_left', { userId, callId })
socket.on('ice_config', { iceServers })
```

---

## 🎥 WebRTC Code Snippets

### Initialize Peer Connection
```typescript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:relay1.metered.ca:80',
      username: 'metered-username',
      credential: 'metered-password'
    }
  ]
};

const pc = new RTCPeerConnection(config);
```

### Get Media Stream
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720, frameRate: 30 },
  audio: true
});
```

### Create Offer
```typescript
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
socket.emit('signal', { 
  toUserId: remoteUserId, 
  data: { type: 'offer', sdp: offer.sdp }
});
```

### Handle Answer
```typescript
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
socket.emit('signal', { 
  toUserId: remoteUserId, 
  data: { type: 'answer', sdp: answer.sdp }
});
```

### Add ICE Candidate
```typescript
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('signal', {
      toUserId: remoteUserId,
      data: { 
        type: 'ice-candidate', 
        candidate: event.candidate 
      }
    });
  }
};
```

### Handle Remote Stream
```typescript
pc.ontrack = (event) => {
  setRemoteStream(event.streams[0]);
};
```

### Screenshare
```typescript
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { cursor: 'always' },
  audio: false
});

const screenTrack = screenStream.getVideoTracks()[0];
const sender = pc.getSenders().find(s => s.track?.kind === 'video');
await sender?.replaceTrack(screenTrack);
```

### Device Switching
```typescript
const newStream = await navigator.mediaDevices.getUserMedia({
  video: { deviceId: { exact: deviceId } }
});

const newTrack = newStream.getVideoTracks()[0];
const sender = pc.getSenders().find(s => s.track?.kind === 'video');
await sender?.replaceTrack(newTrack);
```

---

## 🗄️ MongoDB Schemas

### Call Schema
```typescript
{
  _id: ObjectId,
  callId: String,
  roomCode: String,
  createdBy: String, // userId
  status: 'active' | 'ended',
  startedAt: Date,
  endedAt: Date,
  participants: [String], // userIds
  media: {
    screenshare: Boolean
  }
}
```

### Participant Schema
```typescript
{
  _id: ObjectId,
  callId: String,
  userId: String,
  role: 'student' | 'tutor',
  joinedAt: Date,
  leftAt: Date,
  stats: {
    avgRttMs: Number,
    avgBitrateKbps: Number,
    lossPct: Number
  }
}
```

---

## 🔴 Redis Keys

```redis
presence:online:<userId>     # User online status
route:user:<userId>          # Socket IDs for user
room:members:<callId>        # Call participants
```

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Backend running on port 3000
- [ ] Frontend running on port 5173
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Socket.IO connected

### Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

### Network Testing
- [ ] P2P connection (same network)
- [ ] TURN fallback (different networks)
- [ ] Restrictive network (corporate firewall)

### Feature Testing
- [ ] Audio works
- [ ] Video works
- [ ] Mute/unmute works
- [ ] Camera on/off works
- [ ] Screenshare works
- [ ] Device switching works
- [ ] Call ends cleanly

---

## 🐛 Common Issues & Fixes

### Issue: "getUserMedia() failed"
**Fix:** 
- Ensure HTTPS/WSS
- Check browser permissions
- Check camera/mic availability

### Issue: "ICE connection failed"
**Fix:**
- Verify TURN server accessible
- Check firewall settings
- Test with trickle-ice tool

### Issue: "No audio/video"
**Fix:**
- Check track state
- Verify addTrack() called
- Check remote stream

### Issue: "High latency"
**Fix:**
- Check network conditions
- Verify P2P connection (not TURN)
- Check CPU usage

---

## 📊 Call Health Monitoring

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const stats = await pc.getStats();
    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        console.log('RTT:', report.currentRoundTripTime);
        console.log('Bitrate:', report.availableOutgoingBitrate);
      }
    });
  }, 5000);
  
  return () => clearInterval(interval);
}, []);
```

---

## 🔗 Useful Links

- **Trickle ICE Test**: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- **WebRTC Internals**: chrome://webrtc-internals/
- **getUserMedia Demo**: https://webrtc.github.io/samples/src/content/getusermedia/gum/
- **Metered.ca Dashboard**: https://dashboard.metered.ca/
- **Socket.IO Docs**: https://socket.io/docs/v4/

---

## 📞 Support

**Questions?** Check the full implementation guide: `IMPLEMENTATION_GUIDE.md`

**Issues?** Check troubleshooting section or review code comments.

---

**Last Updated:** January 2025

