# CampusLearn WebRTC Video Calling - Implementation Guide

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** In Progress

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Services & Infrastructure](#services--infrastructure)
4. [Architecture](#architecture)
5. [Implementation Milestones](#implementation-milestones)
6. [API Reference](#api-reference)
7. [Testing & Deployment](#testing--deployment)

---

## Overview

### What We're Building

A **1:1 video calling feature** with:
- ✅ Real-time audio/video communication
- ✅ Screenshare capability
- ✅ Mute/unmute, camera on/off controls
- ✅ Device switching (camera/microphone)
- ✅ P2P connection with TURN fallback
- ✅ Call metadata persistence
- ✅ User presence tracking

### Current Status

**Current Phase:** Milestone 1 - Backend Foundation

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **TypeScript** | 5.x | Type-safe development |
| **Express** | 4.x | HTTP server framework |
| **Socket.IO** | 4.8+ | WebSocket signaling |
| **@socket.io/redis-adapter** | 8.3+ | Multi-server scaling |
| **MongoDB** | Latest | Call metadata storage |
| **Mongoose** | 7.x | MongoDB ODM |
| **Redis (ioredis)** | 5.x | Presence & routing cache |
| **JWT** | 9.x | Authentication |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework |
| **TypeScript** | 5.x | Type-safe development |
| **Socket.IO Client** | 4.8+ | WebSocket client |
| **WebRTC APIs** | Native | Peer-to-peer media |
| **Tailwind CSS** | 3.x | Styling |
| **Vite** | 5.x | Build tool |

### WebRTC APIs (Browser Native)

- `RTCPeerConnection` - Peer connection management
- `getUserMedia()` - Camera/microphone access
- `getDisplayMedia()` - Screenshare
- `MediaStream` - Media track handling
- `RTCDataChannel` - Data transmission (future)

---

## Services & Infrastructure

### 1. TURN/STUN Server: Metered.ca

**Service:** Metered.ca TURN Server  
**Plan:** Free Tier  
**Bandwidth:** 20 GB/month (~400 hours of 1:1 video)  
**Dashboard:** https://dashboard.metered.ca/

**Configuration:**
```env
# STUN (Free - Google)
STUN_URL=stun:stun.l.google.com:19302

# TURN (Metered.ca)
TURN_URL=turn:relay1.metered.ca:80
TURN_USERNAME=<your-username>
TURN_CREDENTIAL=<your-password>
```

**Features:**
- ✅ Global geo-location targeting
- ✅ Low latency
- ✅ TLS/443 support
- ✅ API for credential management
- ✅ 20GB free bandwidth

### 2. Redis (Existing)

**Purpose:** 
- User presence tracking
- Socket ID routing
- Rate limiting
- Room membership

**Keys Used:**
```redis
presence:online:<userId>     # User online status
route:user:<userId>          # Socket IDs for user
room:members:<callId>        # Call participants
```

### 3. MongoDB (Existing)

**Collections:**
- `calls` - Call lifecycle & metadata
- `callParticipants` - Participant details & stats
- `signalingEvents` (optional) - Debug logging

### 4. Socket.IO (Existing)

**Namespaces:**
- `/` - Default (chat, forum)
- `/video` - Video calling signaling (NEW)

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │   WebRTC     │  │  Socket.IO   │      │
│  │  Components  │◄─┤  Hooks       │◄─┤   Client     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │   HTTP/HTTPS     │   WSS            │   WebRTC
          │                  │   Signaling      │   Media
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Socket.IO   │  │   Redis      │      │
│  │   REST API   │  │   /video     │  │   Adapter    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │   MongoDB       │                       │
│                   │   (Call Data)   │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Popup Window Architecture (Dedicated Call Window)

```
Main App (Parent)                          Popup Window (Child)
┌───────────────────────────────┐         ┌────────────────────────────────┐
│ React Shell (Navbar, Pages)   │         │ /call/:callId route (no nav)  │
│                               │  open   │ Renders WebRTC UI components  │
│ User clicks "Join Call" ───────────────►│ - VideoCallPanel              │
│                               │         │ - CallControls                │
│ Stays navigable               │◄────────┤ - CallHealth (optional)      │
│                               │  postMsg │                                │
└───────────────────────────────┘         └────────────────────────────────┘

Auth & Config
 - Preferred: same-origin popup relies on existing cookies/JWT.
 - Alternative: parent sends a short-lived token via window.postMessage.
 - Popup fetches ICE config from GET /api/video/ice-config.

Lifecycle
 - Open via window.open with features: "noopener,noreferrer,resizable,width=1200,height=800,menubar=no,toolbar=no,location=no,status=no".
 - End call cleanly on popup beforeunload/unload.
 - Optional: parent listens for child-closed to offer "Rejoin".
```

### Signaling Flow

```
User A                           Server                          User B
  │                                │                               │
  │─── join_call(callId) ─────────>│                               │
  │<─── peer_joined(userB) ────────│                               │
  │                                │                               │
  │─── signal(offer) ─────────────>│                               │
  │                                │─── signal(offer) ────────────>│
  │                                │                               │
  │                                │<─── signal(answer) ───────────│
  │<─── signal(answer) ────────────│                               │
  │                                │                               │
  │─── signal(ice-candidate) ─────>│                               │
  │                                │─── signal(ice-candidate) ────>│
  │                                │                               │
  │◄─────── WebRTC Media ──────────┼─────────── WebRTC Media ────►│
  │         (P2P or via TURN)      │                               │
```

### Data Flow

```
┌─────────────┐
│   Browser   │
│ getUserMedia│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ MediaStream │
│   (Tracks)  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ RTCPeerConnection│
│  - Add tracks    │
│  - Create offer  │
│  - ICE gathering │
└──────┬───────────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  Socket.IO  │◄────►│   Redis      │
│  Signaling  │      │   Presence   │
└─────────────┘      └──────────────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  MongoDB    │      │   TURN       │
│  Call Data  │      │   Server     │
└─────────────┘      └──────────────┘
```

---

## Implementation Milestones

### Milestone 1: Backend Foundation

**Goal:** Signaling infrastructure ready

#### Tasks:

**1.1 Install Dependencies**
```bash
cd backend
npm install @socket.io/redis-adapter@^8.3.0
```

**1.2 Create MongoDB Schemas**

- [ ] `backend/src/schemas/call.schema.ts`
  - Fields: callId, roomCode, createdBy, status, startedAt, endedAt, participants[]
  
- [ ] `backend/src/schemas/callParticipant.schema.ts`
  - Fields: callId, userId, role, joinedAt, leftAt, stats

**1.3 Setup Socket.IO Redis Adapter**

- [ ] Update `backend/src/config/socket.ts`
- [ ] Import `createAdapter` from `@socket.io/redis-adapter`
- [ ] Create pub/sub Redis clients
- [ ] Attach adapter to Socket.IO

**1.4 Create Video Namespace**

- [ ] Add `/video` namespace in `socket.ts`
- [ ] Add JWT authentication middleware
- [ ] Handle connection/disconnection events

**1.5 Implement Realtime Services**

- [ ] `backend/src/realtime/presence.service.ts`
  - `setUserOnline(userId, socketId)`
  - `setUserOffline(userId, socketId)`
  - `getUserSockets(userId)`
  
- [ ] `backend/src/realtime/signaling.service.ts`
  - `join_call` event handler
  - `signal` event handler (offer/answer/ICE)
  - `leave_call` event handler
  
- [ ] `backend/src/realtime/call.service.ts`
  - `createCall(userId, roomCode)`
  - `joinCall(callId, userId)`
  - `leaveCall(callId, userId)`
  - `endCall(callId)`

**1.6 ICE Configuration**

- [ ] `backend/src/realtime/iceConfig.ts`
- [ ] Create `GET /api/video/ice-config` endpoint
- [ ] Return STUN + TURN credentials

**Deliverables:**
- ✅ Socket.IO Redis adapter working
- ✅ `/video` namespace accepting connections
- ✅ Call/Participant models created
- ✅ Signaling events implemented
- ✅ ICE config endpoint working

---

### Milestone 2: TURN Server Setup

**Goal:** TURN connectivity verified

#### Tasks:

**2.1 Configure Metered.ca Credentials**

- [ ] Add environment variables:
  ```env
  STUN_URL=stun:stun.l.google.com:19302
  TURN_URL=turn:relay1.metered.ca:80
  TURN_USERNAME=<your-username>
  TURN_CREDENTIAL=<your-password>
  ```

**2.2 Test TURN Connectivity**

- [ ] Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- [ ] Enter TURN credentials
- [ ] Verify relay candidates appear
- [ ] Check latency < 100ms

**2.3 Update ICE Config Endpoint**

- [ ] Return proper ICE server configuration
- [ ] Include STUN + TURN in correct order
- [ ] Add TLS/443 support

**Deliverables:**
- ✅ TURN server accessible
- ✅ Relay candidates working
- ✅ ICE config endpoint returns valid credentials

---

### Milestone 3: Frontend WebRTC Core

**Goal:** Basic 1:1 video works

#### Tasks:

**3.1 Create WebRTC Hooks**

- [ ] `frontend/src/hooks/webrtc/usePeerConnection.ts`
  - RTCPeerConnection initialization
  - Offer/answer logic
  - ICE candidate handling
  - Track management
  - Connection state management

- [ ] `frontend/src/hooks/webrtc/useDevices.ts`
  - Device enumeration
  - Device switching with replaceTrack
  - Device change detection

- [ ] `frontend/src/hooks/webrtc/useVideoSignaling.ts`
  - Connect to `/video` namespace
  - Handle join/signal/leave events
  - Send signaling messages

**3.2 Create Video Call Components**

- [ ] `frontend/src/components/video-call/VideoCallPanel.tsx`
  - Local/remote video elements
  - Video ref management
  - Stream attachment

- [ ] `frontend/src/components/video-call/CallControls.tsx`
  - Mute/unmute button
  - Camera on/off button
  - Screenshare button
  - End call button

- [ ] `frontend/src/components/video-call/CallHealth.tsx`
  - RTT display
  - Bitrate display
  - Connection quality indicator

**3.3 Integrate Signaling**

- [ ] Connect Socket.IO to WebRTC
- [ ] Send offer/answer via signaling
- [ ] Exchange ICE candidates
- [ ] Handle peer joined/left events

**3.4 Popup Window Flow (Routing & Launch)**

- [ ] Add route `frontend/src/pages/Call/VideoCallPage.tsx` mounted at `/call/:callId` (no app navbar/shell)
- [ ] Add `openCallPopup(callId: string)` utility using `window.open` with restricted UI features
- [ ] In parent window, add a small launcher that calls `openCallPopup` and tracks the popup handle
- [ ] Popup loads hooks/components from 3.1/3.2 and joins signaling using auth cookies or a short-lived token

**Deliverables:**
- ✅ RTCPeerConnection can be created
- ✅ Socket.IO connected to /video namespace
- ✅ ICE candidates exchanged
- ✅ Local/remote video streams displayed
- ✅ Basic call controls functional

---

### Milestone 4: Features & UI

**Goal:** Usable MVP with all features

#### Tasks:

**4.1 Implement Screenshare**

- [ ] `getDisplayMedia()` integration
- [ ] Replace camera track with screen track
- [ ] Handle screen share end event
- [ ] UI toggle for screenshare

**4.2 Implement Device Switching**

- [ ] Camera switching with `replaceTrack()`
- [ ] Microphone switching with `replaceTrack()`
- [ ] Device selector dropdown
- [ ] Old track cleanup

**4.3 Add Call Health Monitoring**

- [ ] `getStats()` polling (every 5-10s)
- [ ] Parse RTT, jitter, bitrate, packet loss
- [ ] Display in CallHealth component
- [ ] Optional: Send stats to backend

**4.4 Polish UI**

- [ ] Responsive grid layout
- [ ] Control bar styling
- [ ] Loading states
- [ ] Error messages
- [ ] Connection indicators

**4.5 Error Handling**

- [ ] Camera/mic permission denied
- [ ] Connection failed
- [ ] ICE connection failed
- [ ] Peer disconnected unexpectedly
- [ ] Network change detection

**4.6 Popup Lifecycle & Security Enhancements**

- [ ] Cleanup on `beforeunload`/`unload` in popup (leave call, close PC, stop media tracks)
- [ ] Optional parent↔child coordination via `postMessage` (e.g., end call from main app)
- [ ] Ensure same-origin; avoid tokens in URL; prefer cookies or `postMessage` ephemeral token

**Deliverables:**
- ✅ Screenshare working
- ✅ Device switching functional
- ✅ Call health visible
- ✅ UI polished and responsive
- ✅ Error handling comprehensive

---

### Milestone 5: Testing & Deployment

**Goal:** Stable MVP deployed

#### Tasks:

**5.1 Cross-Browser Testing**

- [ ] Chrome (desktop)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Edge

**5.2 Network Testing**

- [ ] Test P2P connection (same network)
- [ ] Test TURN fallback (different networks)
- [ ] Test on restrictive networks
- [ ] Test on mobile networks

**5.3 Integration Testing**

- [ ] End-to-end call flow
- [ ] Multiple calls in parallel
- [ ] Reconnection after disconnect
- [ ] Call metadata persistence

**5.4 Performance Testing**

- [ ] CPU usage monitoring
- [ ] Memory leak detection
- [ ] Bandwidth usage
- [ ] Latency measurement

**5.5 Deployment**

- [ ] Deploy to staging
- [ ] Verify HTTPS/WSS
- [ ] Verify TURN credentials
- [ ] Test from external network
- [ ] Monitor logs

**Deliverables:**
- ✅ Works on Chrome desktop
- ✅ Works on at least 1 other browser
- ✅ TURN fallback verified
- ✅ Deployed to staging
- ✅ Tested by 2+ users

---

## API Reference

### Socket.IO Events (`/video` namespace)

#### Client → Server

```typescript
// Join a call
socket.emit('join_call', {
  callId: string,
  userId: string,
  token: string // JWT
});

// Send signaling data (offer/answer/ICE)
socket.emit('signal', {
  callId: string,
  toUserId: string,
  data: {
    type: 'offer' | 'answer' | 'ice-candidate',
    sdp?: string,
    candidate?: RTCIceCandidateInit
  }
});

// Leave a call
socket.emit('leave_call', {
  callId: string,
  userId: string
});
```

#### Server → Client

```typescript
// Peer joined the call
socket.on('peer_joined', {
  userId: string,
  callId: string
});

// Receive signaling data
socket.on('signal', {
  fromUserId: string,
  data: {
    type: 'offer' | 'answer' | 'ice-candidate',
    sdp?: string,
    candidate?: RTCIceCandidateInit
  }
});

// Peer left the call
socket.on('peer_left', {
  userId: string,
  callId: string
});

// ICE configuration
socket.on('ice_config', {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:relay1.metered.ca:80',
      username: string,
      credential: string
    }
  ]
});
```

### REST Endpoints

```typescript
// Get ICE configuration
GET /api/video/ice-config
Response: {
  iceServers: RTCIceServer[]
}

// Get call details
GET /api/video/calls/:callId
Response: {
  callId: string,
  roomCode: string,
  status: 'active' | 'ended',
  participants: Participant[],
  startedAt: Date,
  endedAt?: Date
}

// Get user's calls
GET /api/video/calls/user/:userId
Response: Call[]
```

### MongoDB Schemas

```typescript
// Call Schema
interface Call {
  _id: string;
  callId: string;
  roomCode: string;
  createdBy: string; // userId
  status: 'active' | 'ended';
  startedAt: Date;
  endedAt?: Date;
  participants: string[]; // userIds
  media: {
    screenshare: boolean;
  };
  icePolicy: {
    turnRequired: boolean;
  };
}

// Participant Schema
interface CallParticipant {
  _id: string;
  callId: string;
  userId: string;
  role: 'student' | 'tutor';
  joinedAt: Date;
  leftAt?: Date;
  stats: {
    avgRttMs: number;
    avgBitrateKbps: number;
    lossPct: number;
  };
}
```

---

## Testing & Deployment

### Local Testing

```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev

# Test with 2 browsers
# Chrome: http://localhost:5173
# Firefox: http://localhost:5173
```

### Testing Tools

- **Trickle ICE**: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- **WebRTC Internals**: chrome://webrtc-internals/
- **getUserMedia Demo**: https://webrtc.github.io/samples/src/content/getusermedia/gum/

### Deployment Checklist

- [ ] HTTPS/WSS configured
- [ ] TURN credentials set
- [ ] Redis accessible
- [ ] MongoDB accessible
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Monitoring set up

### Environment Variables

```env
# Backend
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_ISSUER=campuslearn
JWT_AUDIENCE=campuslearn-users

# TURN/STUN
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:relay1.metered.ca:80
TURN_USERNAME=<metered-username>
TURN_CREDENTIAL=<metered-password>

# Frontend
VITE_API_URL=https://api.campuslearn.com
VITE_WS_URL=wss://api.campuslearn.com
```

---

## Success Criteria

### MVP Must Have ✅

- [ ] Two users can join a video call
- [ ] Audio and video work P2P
- [ ] Mute/unmute microphone
- [ ] Turn camera on/off
- [ ] Screenshare works
- [ ] Call ends cleanly
- [ ] TURN fallback works on restrictive networks
- [ ] Works on Chrome desktop
- [ ] Call metadata saved to database

### Nice to Have (Week 2) 📋

- [ ] Device switching
- [ ] Call quality stats
- [ ] Recording
- [ ] Reconnection on network change
- [ ] Multiple browser support
- [ ] Mobile support

---

## Troubleshooting

### Common Issues

**1. "getUserMedia() failed"**
- Check HTTPS/WSS
- Check browser permissions
- Check camera/mic availability

**2. "ICE connection failed"**
- Verify TURN server accessible
- Check firewall settings
- Test with trickle-ice tool

**3. "No audio/video"**
- Check track state
- Verify addTrack() called
- Check remote stream

**4. "High latency"**
- Check network conditions
- Verify P2P connection (not TURN)
- Check CPU usage

### Debug Commands

```javascript
// Check ICE gathering state
pc.iceGatheringState

// Check connection state
pc.connectionState

// Get stats
pc.getStats().then(stats => {
  stats.forEach(report => {
    console.log(report);
  });
});

// Check local/remote descriptions
pc.localDescription
pc.remoteDescription
```

---

## Resources

### Documentation
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO](https://socket.io/docs/v4/)
- [Metered.ca Docs](https://www.metered.ca/docs/)

### Testing Tools
- [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/)
- [WebRTC Internals](chrome://webrtc-internals/)
- [getUserMedia Demo](https://webrtc.github.io/samples/src/content/getusermedia/gum/)

### Tutorials
- [WebRTC.ventures Guide](https://webrtc.ventures/)
- [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity)

---

## Support

**Questions?** Check the troubleshooting section or review the code comments.

**Issues?** Create a GitHub issue with:
- Browser/OS version
- Error message
- Steps to reproduce
- WebRTC internals dump

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** In Progress - Milestone 1

