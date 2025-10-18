# Online Status Testing Guide

## 🧪 **Test Scenario: Online Status Logic**

### **What Should Happen:**
1. **When you visit Messages page**: You should show as "online" to ALL other users
2. **When other users visit Messages page**: They should show as "online" to you
3. **When you leave/close browser**: You should show as "offline" to others
4. **Status should be global**: Not just per chat room, but across the entire app

### **How to Test:**

#### **Test 1: Basic Online Status**
1. Open two browser windows/tabs with different user accounts
2. Both users go to Messages page
3. **Expected**: Both users should see each other as "online" (green dot)

#### **Test 2: Status Broadcasting**
1. User A is on Messages page (shows online)
2. User B opens Messages page
3. **Expected**: User A should immediately see User B come online
4. **Expected**: User B should see User A as already online

#### **Test 3: Global Status (Not Room-Specific)**
1. User A is in a chat room with User B
2. User C (not in the room) opens Messages page
3. **Expected**: User C should see User A and User B as online
4. **Expected**: User A and User B should see User C come online

#### **Test 4: Offline Status**
1. User A is online (on Messages page)
2. User A closes browser/tab
3. **Expected**: User B should see User A go offline

### **Backend Implementation Analysis:**

```typescript
// ✅ CORRECT: Global status broadcasting
chat.emit("user_status_change", {
  userId: userId,
  status: "online",
  lastSeen: new Date(),
});

// ✅ CORRECT: Status on disconnect
chat.emit("user_status_change", {
  userId: userId,
  status: "offline", 
  lastSeen: new Date(),
});
```

### **Frontend Implementation Analysis:**

```typescript
// ✅ CORRECT: Global status tracking
const [userOnlineStatus, setUserOnlineStatus] = useState<
  Map<string, { isOnline: boolean; lastSeen?: Date }>
>(new Map());

// ✅ CORRECT: Status change handler
const handleUserStatusChange = useCallback(
  (userId: string, status: "online" | "offline", lastSeen: Date) => {
    setUserOnlineStatus((prev) => {
      const m = new Map(prev);
      m.set(userId, { isOnline: status === "online", lastSeen });
      return m;
    });
  },
  []
);
```

### **Potential Issues to Check:**

1. **Socket Connection**: Make sure socket connects to `/chat` namespace
2. **Authentication**: Ensure JWT token is valid for socket auth
3. **Event Broadcasting**: Verify `user_status_change` events are being emitted
4. **Frontend Listeners**: Check if `useChatSocket` is properly listening
5. **State Updates**: Verify status changes update the UI

### **Debug Steps:**

1. **Check Browser Console**: Look for socket connection logs
2. **Check Network Tab**: Verify WebSocket connection to `/chat`
3. **Check Backend Logs**: Look for "user_status_change" emissions
4. **Check Frontend State**: Verify `userOnlineStatus` Map updates

### **Expected Console Logs:**

```
🔌 Creating Socket.IO connection to: ws://localhost:3000/chat
✅ Chat socket connected successfully!
🔌 Socket received user_status_change: {userId: "123", status: "online", lastSeen: "2024-01-01T00:00:00.000Z"}
🟢 Status update received: User 123 is online (last seen: 2024-01-01T00:00:00.000Z)
```

### **If Status Not Working:**

1. **Check Socket Connection**: Ensure WebSocket connects successfully
2. **Check Authentication**: Verify JWT token is valid
3. **Check Event Handlers**: Ensure `onUserStatusChange` callback is provided
4. **Check Room Joining**: Status should work globally, not just in rooms
5. **Check Backend Broadcasting**: Verify events are emitted to all clients

## ✅ **Implementation Looks Correct!**

The online status system should work as expected:
- **Global Status**: Shows online status across entire app, not just per room
- **Real-time Updates**: Status changes are broadcast immediately
- **Proper Cleanup**: Offline status is sent when users disconnect
- **Cross-User Visibility**: All users can see each other's status

The implementation follows best practices for real-time status tracking!
