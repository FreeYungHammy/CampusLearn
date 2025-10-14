# CampusLearn WebRTC Video Calling Feature

> **Status:** 🚧 In Development  
> **Version:** 1.0  
> **Last Updated:** January 2025

---

## 📚 Documentation

This WebRTC implementation has three main documentation files:

### 1. **WEBRTC_IMPLEMENTATION_GUIDE.md** 📖
**Complete implementation guide with:**
- Full tech stack details
- Architecture diagrams
- Detailed milestone breakdown
- API reference
- Testing & deployment guide
- Troubleshooting section

👉 **Start here** for comprehensive understanding

### 2. **WEBRTC_QUICK_REFERENCE.md** ⚡
**Quick cheat sheet with:**
- Code snippets
- Socket.IO events
- WebRTC code examples
- MongoDB schemas
- Redis keys
- Common issues & fixes

👉 **Use during development** for quick lookups

### 3. **This File (WEBRTC_README.md)** 📋
**Overview and getting started:**
- Feature overview
- Quick start guide
- Documentation index
- Current status

---

## 🎯 What We're Building

A **1:1 video calling feature** with:
- ✅ Real-time audio/video communication
- ✅ Screenshare capability  
- ✅ Mute/unmute, camera on/off controls
- ✅ Device switching (camera/microphone)
- ✅ P2P connection with TURN fallback
- ✅ Call metadata persistence
- ✅ User presence tracking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running
- Redis running
- Metered.ca account (free tier: 20GB/month)

### Installation

```bash
# 1. Install backend dependencies
cd backend
npm install @socket.io/redis-adapter@^8.3.0

# 2. Install frontend dependencies (if needed)
cd ../frontend
npm install socket.io-client@^8.3.0

# 3. Configure environment variables
# Add to backend/.env:
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:relay1.metered.ca:80
TURN_USERNAME=<your-metered-username>
TURN_CREDENTIAL=<your-metered-password>
```

### Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Test TURN Server

Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

Enter your Metered.ca credentials and verify relay candidates appear.

---

## 📁 Project Structure

```
CampusLearn/
├── docs/
│   └── WebRTC/
│       ├── README.md                    # This file
│       ├── IMPLEMENTATION_GUIDE.md     # Complete guide
│       └── QUICK_REFERENCE.md          # Quick reference
│
├── backend/
│   ├── src/
│   │   ├── schemas/
│   │   │   ├── call.schema.ts         # Call model
│   │   │   └── callParticipant.schema.ts  # Participant model
│   │   ├── realtime/
│   │   │   ├── signaling.service.ts   # Signaling logic
│   │   │   ├── presence.service.ts    # User presence
│   │   │   ├── call.service.ts        # Call lifecycle
│   │   │   └── iceConfig.ts           # ICE/TURN config
│   │   └── config/
│   │       └── socket.ts              # Socket.IO setup
│
└── frontend/
    └── src/
        ├── hooks/webrtc/
        │   ├── usePeerConnection.ts   # WebRTC hook
        │   ├── useDevices.ts          # Device management
        │   └── useVideoSignaling.ts   # Signaling hook
        └── components/video-call/
            ├── VideoCallPanel.tsx     # Main UI
            ├── CallControls.tsx       # Controls
            └── CallHealth.tsx         # Stats display
```

---

## 🗺️ Implementation Roadmap

### ✅ Milestone 1: Backend Foundation
- [ ] Install dependencies
- [ ] Create MongoDB schemas
- [ ] Setup Socket.IO Redis adapter
- [ ] Create `/video` namespace
- [ ] Implement signaling events
- [ ] Create ICE config endpoint

### 🔄 Milestone 2: TURN Server Setup
- [ ] Configure Metered.ca credentials
- [ ] Test TURN connectivity
- [ ] Verify relay candidates

### 📋 Milestone 3: Frontend WebRTC Core
- [ ] Create WebRTC hooks
- [ ] Create video call components
- [ ] Integrate signaling
- [ ] Test basic 1:1 video

### 📋 Milestone 3.5: Popup Window Flow
- [ ] Add route `/call/:callId` rendering `VideoCallPage` (no nav shell)
- [ ] Add `openCallPopup(callId: string)` to open dedicated window with limited chrome
- [ ] Use same-origin cookies/JWT or `postMessage` to supply short-lived token
- [ ] Popup fetches `/api/video/ice-config` and joins signaling

### 📋 Milestone 4: Features & UI
- [ ] Implement screenshare
- [ ] Implement device switching
- [ ] Add call health monitoring
- [ ] Polish UI
- [ ] Add error handling

### 📋 Milestone 4.5: Popup Lifecycle & Security
- [ ] Clean leave on popup close (unload)
- [ ] Optional parent↔child `postMessage` coordination
- [ ] Avoid tokens in URL; prefer cookies or ephemeral token via `postMessage`

### 📋 Milestone 5: Testing & Deployment
- [ ] Cross-browser testing
- [ ] Network testing
- [ ] Integration testing
- [ ] Performance testing
- [ ] Deploy to staging

---

## 🛠️ Tech Stack

### Backend
- Node.js + TypeScript
- Express
- Socket.IO + Redis Adapter
- MongoDB + Mongoose
- Redis (ioredis)
- JWT

### Frontend
- React + TypeScript
- Socket.IO Client
- WebRTC APIs (native)
- Tailwind CSS
- Vite

### Infrastructure
- **TURN/STUN**: Metered.ca (20GB free/month)
- **Redis**: Presence & routing
- **MongoDB**: Call metadata

---

## 📖 Documentation Index

### For Developers

1. **Getting Started**: Read this file (README.md)
2. **Implementation Details**: Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
3. **Quick Reference**: Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) during development

### Key Sections

**Implementation Guide:**
- [Tech Stack](./IMPLEMENTATION_GUIDE.md#tech-stack)
- [Architecture](./IMPLEMENTATION_GUIDE.md#architecture)
- [Implementation Milestones](./IMPLEMENTATION_GUIDE.md#implementation-milestones)
- [API Reference](./IMPLEMENTATION_GUIDE.md#api-reference)
- [Testing & Deployment](./IMPLEMENTATION_GUIDE.md#testing--deployment)

**Quick Reference:**
- [Code Snippets](./QUICK_REFERENCE.md#-webrtc-code-snippets)
- [Socket.IO Events](./QUICK_REFERENCE.md#-socketio-events)
- [MongoDB Schemas](./QUICK_REFERENCE.md#-mongodb-schemas)
- [Common Issues](./QUICK_REFERENCE.md#-common-issues--fixes)

---

## 🧪 Testing

### Local Testing
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Open two browser windows:
# Chrome: http://localhost:5173
# Firefox: http://localhost:5173
```

### Test TURN Server
Visit: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

### Test WebRTC Internals
Chrome: `chrome://webrtc-internals/`

---

## 🐛 Troubleshooting

### Common Issues

**1. "getUserMedia() failed"**
- Ensure HTTPS/WSS
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

### Debug Commands

```javascript
// Check ICE gathering state
pc.iceGatheringState

// Check connection state
pc.connectionState

// Get stats
pc.getStats().then(stats => {
  stats.forEach(report => console.log(report));
});
```

For more troubleshooting help, see the [Troubleshooting Section](./IMPLEMENTATION_GUIDE.md#troubleshooting) in the implementation guide.

---

## 📊 Current Status

### ✅ Completed
- Documentation created
- Tech stack defined
- Architecture designed
- TURN server configured (Metered.ca)

### 🚧 In Progress
- Milestone 1: Backend Foundation

### 📋 Upcoming
- Milestone 2: TURN Server Setup
- Milestone 3: Frontend WebRTC Core
- Milestone 4: Features & UI
- Milestone 5: Testing & Deployment

---

## 🎯 Success Criteria

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

### Nice to Have (Future) 📋
- [ ] Device switching
- [ ] Call quality stats
- [ ] Recording
- [ ] Reconnection on network change
- [ ] Multiple browser support
- [ ] Mobile support

---

## 🔗 Resources

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

## 📞 Support

**Questions?** 
- Check the [Implementation Guide](./WEBRTC_IMPLEMENTATION_GUIDE.md)
- Review the [Quick Reference](./WEBRTC_QUICK_REFERENCE.md)
- Check the troubleshooting section

**Issues?**
- Review error messages
- Check WebRTC internals dump
- Verify TURN server connectivity

---

## 📝 Notes

- **Current Phase**: Milestone 1 - Backend Foundation
- **Next Steps**: Complete backend signaling infrastructure
- **Blockers**: None currently

---

**Last Updated:** January 2025  
**Version:** 1.0  
**Status:** 🚧 In Development - Milestone 1

---

## 🚀 Ready to Start?

1. ✅ Read this file (you're here!)
2. 📖 Read [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
3. ⚡ Keep [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) handy
4. 🛠️ Start with Milestone 1: Backend Foundation

**Let's build something amazing! 🎉**

