# Video Call UI Improvements Plan

**Status**: Ready for Implementation  
**Created**: 2025-10-19  
**Priority**: High  
**Estimated Time**: 4-6 hours

## Overview

This document outlines planned improvements to the CampusLearn video call interface to enhance user experience, fix UX issues, and add polish to the video calling feature. The implementation focuses on better loading states, connection status visibility, preventing duplicate calls, and persisting user preferences.

## Background

The current video call implementation works functionally but has several UX issues:
- Black screen when waiting for remote peer (no loading indicator)
- Technical debug information visible to end users
- No prevention of duplicate call windows
- Video/audio state doesn't persist across page refreshes
- UI needs polish (call ID visible, no confirmation on leaving)
- Botpress chatbot widget appears on call screen

## Prerequisites

- `framer-motion` is already installed (v11.0.0, confirmed in `package.json`)
- Project uses TypeScript, React 18.3.1, Zustand for state management
- Existing WebRTC infrastructure is functional

---

## Implementation Tasks

### 1. Create Animated Circular Progress Bar Component

**Priority**: High  
**Estimated Time**: 30 minutes

**Objective**: Create a reusable animated loading indicator for the video call waiting state.

**Files to Create**:
- `frontend/src/components/ui/animated-circular-progress-bar.tsx`

**Implementation Details**:
- Copy component code from [Magic UI Documentation](https://magicui.design/docs/components/animated-circular-progress-bar)
- Adapt for TypeScript and existing project structure
- Use `framer-motion`'s `motion.svg` for smooth animations
- Props interface:
  ```typescript
  interface AnimatedCircularProgressBarProps {
    value: number;
    max?: number;
    min?: number;
    gaugePrimaryColor?: string;
    gaugeSecondaryColor?: string;
    className?: string;
  }
  ```
- For video call waiting state, use in **indeterminate mode** (continuous animation without specific progress value)

**Acceptance Criteria**:
- Component renders circular progress indicator
- Animates smoothly using framer-motion
- Accepts color customization props
- TypeScript types are properly defined

---

### 2. Add Remote Peer Waiting State

**Priority**: High  
**Estimated Time**: 1 hour

**Objective**: Show a loading indicator with message when waiting for the remote peer to join the call.

**Files to Modify**:
- `frontend/src/pages/Call/VideoCallPage.tsx`
- `frontend/src/components/video-call/VideoCallPanel.tsx`

**Implementation Details**:

**VideoCallPage.tsx**:
- Add state: `const [remotePeerJoined, setRemotePeerJoined] = useState(false)`
- Update state when `peer_joined` event fires via signaling
- Update state when `remoteStream` becomes available
- Pass `remotePeerJoined` prop to `VideoCallPanel`

**VideoCallPanel.tsx**:
- Add prop: `remotePeerJoined: boolean`
- When `!remoteStream && !remotePeerJoined`, render centered overlay:
  - Dark semi-transparent backdrop
  - Animated circular progress bar (indeterminate mode)
  - Text: "Waiting for [username] to join..."
  - Center in main video area

**Acceptance Criteria**:
- Loading indicator appears when call starts and remote peer hasn't joined
- Loading indicator disappears when remote video stream arrives
- Message is clear and user-friendly
- Smooth transition when remote stream appears

---

### 3. Replace Debug Status with User-Friendly Status

**Priority**: Medium  
**Estimated Time**: 45 minutes

**Objective**: Replace technical debug information with user-friendly connection status.

**Files to Modify**:
- `frontend/src/pages/Call/VideoCallPage.tsx` (lines 225-246)

**Implementation Details**:
- Remove existing debug status div showing:
  - `Signaling: have-local-offer`
  - `ICE Conn: new`
  - `ICE Gather: new`
- Replace with cleaner status badge showing:
  - **Connection Quality**: Color-coded dot + text
    - 🟢 Excellent (green)
    - 🔵 Good (blue)
    - 🟡 Fair (yellow)
    - 🔴 Poor (red)
  - **Connection Status**: Text only
    - "Connecting..."
    - "Connected"
    - "Reconnecting..."
- Position: bottom-left corner
- Styling: smaller, less intrusive, semi-transparent background
- Use existing states: `pc.connectionQuality` and `pc.isReconnecting`

**Acceptance Criteria**:
- Status indicator is easy to understand for non-technical users
- Connection quality accurately reflects network conditions
- Status updates in real-time as connection state changes
- UI is clean and doesn't obstruct video

---

### 4. Prevent Duplicate Video Calls

**Priority**: High  
**Estimated Time**: 1 hour

**Objective**: Prevent users from opening multiple video call windows for the same conversation.

**Files to Create**:
- `frontend/src/store/callStore.ts`

**Files to Modify**:
- `frontend/src/pages/Messages.tsx` (lines 621-639, `handleStartVideoCall` function)
- `frontend/src/pages/Call/VideoCallPage.tsx`

**Implementation Details**:

**callStore.ts** (new file):
```typescript
import { create } from 'zustand';

interface CallStore {
  activeCallId: string | null;
  setActiveCallId: (id: string) => void;
  clearActiveCallId: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCallId: null,
  setActiveCallId: (id) => set({ activeCallId: id }),
  clearActiveCallId: () => set({ activeCallId: null }),
}));
```

**Messages.tsx**:
- Import `useCallStore`
- Before opening call window, check if `activeCallId` exists
- If active call exists, show notification: "Call in progress"
- On successful call initiation, set `activeCallId`

**VideoCallPage.tsx**:
- Import `useCallStore`
- On component mount (useEffect), call `setActiveCallId(callId)`
- On component unmount/cleanup, call `clearActiveCallId()`

**Acceptance Criteria**:
- Users cannot open multiple call windows for same conversation
- Clear feedback when attempting to start duplicate call
- Call state is properly cleaned up when call ends
- Works across browser tabs (global state)

---

### 5. Persist Video/Audio State in localStorage

**Priority**: Medium  
**Estimated Time**: 1 hour

**Objective**: Remember user's video/audio preferences across page refreshes.

**Files to Modify**:
- `frontend/src/hooks/webrtc/usePeerConnection.ts`

**Implementation Details**:
- On component initialization, read `localStorage.getItem('callPreferences')`
- Parse JSON: `{ videoEnabled: boolean, audioEnabled: boolean }`
- Initialize `videoEnabled` and `audioEnabled` states from localStorage
- Default to `{ videoEnabled: true, audioEnabled: true }` if not set
- On `toggleCam()`: 
  - Update state
  - Save to localStorage
- On `toggleMic()`:
  - Update state
  - Save to localStorage
- When initializing media stream in `init()`, apply saved preferences

**Example localStorage structure**:
```json
{
  "videoEnabled": false,
  "audioEnabled": true
}
```

**Acceptance Criteria**:
- Video/audio state persists across page refreshes
- Preferences are saved immediately when toggled
- Default behavior is sensible (both enabled)
- localStorage is updated correctly on each toggle

---

### 6. UI Polish - Remove Call ID from Header

**Priority**: Low  
**Estimated Time**: 5 minutes

**Objective**: Clean up header by removing technical call ID.

**Files to Modify**:
- `frontend/src/pages/Call/VideoCallPage.tsx` (line 208)

**Implementation Details**:
- Remove div element: `<div style={{ opacity: 0.7 }}>{callId}</div>`
- Keep only: `<div>CampusLearn • Call</div>`

**Acceptance Criteria**:
- Call ID no longer visible in header
- Header looks cleaner and more professional

---

### 7. UI Polish - Update Header with Call Icon

**Priority**: Low  
**Estimated Time**: 15 minutes

**Objective**: Add visual call icon to header for better branding.

**Files to Modify**:
- `frontend/src/pages/Call/VideoCallPage.tsx` (line 207)

**Implementation Details**:
- Replace text with flex container containing:
  - Phone/call SVG icon (inline)
  - "CampusLearn" text
- Styling: flex layout with gap, centered alignment
- Icon should match existing design system (white, 20-24px)

**Example SVG icon**:
```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
```

**Acceptance Criteria**:
- Icon appears in header next to "CampusLearn"
- Icon is visually consistent with rest of UI
- Text and icon are properly aligned

---

### 8. Dynamic Local Video Preview

**Priority**: Medium  
**Estimated Time**: 30 minutes

**Objective**: Show/hide local video preview based on camera state.

**Files to Modify**:
- `frontend/src/components/video-call/VideoCallPanel.tsx`
- `frontend/src/pages/Call/VideoCallPage.tsx`

**Implementation Details**:

**VideoCallPanel.tsx**:
- Add prop: `localVideoEnabled: boolean`
- Conditionally render local video element:
  ```jsx
  {localVideoEnabled && (
    <video ref={localRef} className="cl-local" autoPlay playsInline muted />
  )}
  ```

**VideoCallPage.tsx**:
- Pass `pc.videoEnabled` to VideoCallPanel:
  ```jsx
  <VideoCallPanel 
    localStream={pc.localStream} 
    remoteStream={pc.remoteStream}
    localVideoEnabled={pc.videoEnabled}
  />
  ```

**Acceptance Criteria**:
- Local video preview disappears when camera is turned off
- Local video preview reappears when camera is turned back on
- Transition is smooth without layout shift
- User understands their camera state visually

---

### 9. Add Leave Call Confirmation Modal

**Priority**: Medium  
**Estimated Time**: 45 minutes

**Objective**: Confirm with user before ending call to prevent accidental disconnects.

**Files to Create**:
- `frontend/src/components/video-call/LeaveConfirmationModal.tsx`

**Files to Modify**:
- `frontend/src/pages/Call/VideoCallPage.tsx`

**Implementation Details**:

**LeaveConfirmationModal.tsx** (new file):
```typescript
interface LeaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
```
- Centered modal with dark semi-transparent backdrop
- Modal content: white/light card with rounded corners
- Title: "End Call?"
- Message: "Are you sure you want to end this call?"
- Two buttons:
  - "Cancel" (secondary style) - calls `onClose()`
  - "End Call" (danger/red style) - calls `onConfirm()`
- Match existing modal styling patterns

**VideoCallPage.tsx**:
- Add state: `const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false)`
- Update CallControls `onLeave` prop: `() => setShowLeaveConfirmation(true)`
- Render modal conditionally: `{showLeaveConfirmation && <LeaveConfirmationModal ... />}`
- Modal `onConfirm` handler:
  ```typescript
  const handleLeaveCall = () => {
    setShowLeaveConfirmation(false);
    // Clear call state
    window.close();
  };
  ```

**Acceptance Criteria**:
- Modal appears when user clicks end call button
- User can cancel and return to call
- User can confirm and call ends
- Modal is styled consistently with app design
- Modal prevents accidental call termination

---

### 10. Hide Botpress Chat on Call Screen

**Priority**: Low  
**Estimated Time**: 15 minutes

**Objective**: Remove chatbot widget from video call screen to avoid clutter.

**Files to Modify**:
- `frontend/src/App.tsx`

**Implementation Details**:
- Import `useLocation` from `react-router-dom` (if not already imported)
- Add location check before rendering BotpressChat:
  ```jsx
  const location = useLocation();
  const isCallPage = location.pathname.startsWith('/call/');
  
  // In render:
  {!isCallPage && <BotpressChat />}
  ```

**Alternative Approach** (if modification in App.tsx is complex):
- Modify `frontend/src/components/BotpressChat/BotpressChat.tsx`
- Add check inside component to conditionally render:
  ```typescript
  const location = useLocation();
  if (location.pathname.startsWith('/call/')) {
    return null;
  }
  ```

**Acceptance Criteria**:
- Botpress chat widget doesn't appear on call screen
- Botpress chat widget still appears on all other pages
- No errors in console related to Botpress

---

## Testing Checklist

After implementation, verify:

- [ ] Loading indicator appears when starting call
- [ ] Loading indicator disappears when remote peer joins
- [ ] Connection status shows accurate information
- [ ] Connection quality indicator updates correctly
- [ ] Cannot open duplicate call windows
- [ ] Video/audio preferences persist across refresh
- [ ] Call ID not visible in header
- [ ] Call icon appears in header
- [ ] Local video preview disappears when camera off
- [ ] Local video preview reappears when camera on
- [ ] Leave confirmation modal appears on end call click
- [ ] Can cancel leaving call
- [ ] Can confirm and end call
- [ ] Botpress chat not visible on call screen
- [ ] Botpress chat still works on other pages

---

## Deployment Notes

- No database migrations required
- No backend changes required
- Frontend-only changes
- localStorage changes are backward compatible
- Can be deployed incrementally (each task is independent)

---

## Future Enhancements (Out of Scope)

- Show username in "Waiting for..." message (requires user data fetching)
- Add call duration timer
- Add network quality metrics (bandwidth, latency)
- Add call recording functionality
- Add screen share quality selector
- Add virtual backgrounds

---

## References

- [Magic UI Animated Progress Bar](https://magicui.design/docs/components/animated-circular-progress-bar)
- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-19  
**Status**: Ready for Implementation

