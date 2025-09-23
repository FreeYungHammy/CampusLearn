# Cursor - AI Software Engineer

This document outlines my role as an AI software engineer for the CampusLearn messaging system implementation and provides a comprehensive overview of our first session's objectives and implementation plan.

## Project Context

CampusLearn is a full-stack educational platform connecting students and tutors with real-time messaging capabilities. The messaging system is a critical component that enables seamless communication between students and their subscribed tutors.

## My Role in This Project

As an AI software engineer, I am responsible for:

- **Messaging System Implementation**: Building a secure, performant, and user-friendly messaging system
- **Real-time Communication**: Implementing WebSocket-based chat functionality with proper connection management
- **Data Flow Optimization**: Ensuring efficient data flow from subscription to conversation to message display
- **UI/UX Implementation**: Creating a messaging interface that matches the design specifications
- **Security & Performance**: Implementing messaging features with business-standard security and performance

## Session 1: Messaging System Implementation Plan

### Current State Analysis

**✅ Existing Infrastructure:**
- Subscription system between students and tutors
- Chat service with MongoDB schema for message persistence
- Socket.IO infrastructure with `/chat` namespace
- Basic Messages page UI structure
- Conversation auto-creation when subscribing to tutors
- Message sending/receiving via WebSockets

**❌ Issues Identified:**
- Messages page doesn't properly connect to subscribed tutors
- Socket connection management needs refinement
- Message history loading has inconsistencies
- UI doesn't match the rework design specifications
- Online status tracking is incomplete
- Profile picture display needs standardization

### Implementation Phases

#### Phase 1: Basic Messaging Functionality
**Priority: HIGH - Core functionality**

**Objectives:**
- Fix conversation loading to properly connect with subscribed tutors
- Ensure subscription → conversation creation → Messages page display works seamlessly
- Implement proper sidebar navigation between tutor chats
- Update Messages page UI to match the rework design

**Technical Tasks:**
1. Modify Messages page to load conversations based on subscribed tutors
2. Verify auto-chat creation when subscribing to tutors
3. Implement sidebar switching between tutor conversations
4. Align UI with `messages_rework.html` design specifications

#### Phase 2: Profile Pictures & Data Flow
**Priority: HIGH - User experience**

**Objectives:**
- Standardize profile picture rendering across the messaging system
- Ensure complete tutor information flows correctly to Messages page
- Maintain data consistency from subscription to conversation to display

**Technical Tasks:**
1. Fix and standardize profile picture display using base64 data
2. Ensure name, subjects, and tutor metadata displays correctly
3. Verify data flow: subscription → conversation → Messages page
4. Implement proper error handling for missing profile data

#### Phase 3: Socket Connection Management
**Priority: HIGH - Real-time functionality**

**Objectives:**
- Improve socket connection with proper user identification
- Ensure asynchronous messaging (messages work even when tutor is offline)
- Implement proper room management for chat switching

**Technical Tasks:**
1. Enhance socket connection to properly identify users on Messages page
2. Implement proper room joining/leaving when switching between chats
3. Verify message persistence to database regardless of online status
4. Add connection status indicators and error handling

#### Phase 4: Message History Integration
**Priority: MEDIUM - Data persistence**

**Objectives:**
- Fix conversation thread loading when clicking on tutor chats
- Verify database can handle message persistence properly
- Optimize message loading for better user experience

**Technical Tasks:**
1. Fix conversation thread loading API integration
2. Verify message saving/retrieval works correctly
3. Implement proper message persistence and retrieval
4. Add performance optimizations for message loading

#### Phase 5: UI Improvements
**Priority: MEDIUM - Polish and user experience**

**Objectives:**
- Implement proper online/offline status with timestamps
- Complete UI alignment with rework design
- Add responsive design and loading states

**Technical Tasks:**
1. Implement online status tracking with last seen timestamps
2. Complete UI updates to match rework design exactly
3. Ensure mobile-friendly messaging interface
4. Add proper loading indicators and error handling

#### Phase 6: File Upload Integration
**Priority: LOW - Future enhancement**

**Status: DEFERRED** - Focusing on core messaging functionality first

### Technical Architecture

#### Database Schema
```typescript
// Current Chat Schema (MongoDB)
{
  senderId: ObjectId,      // Reference to User
  receiverId: ObjectId,    // Reference to User  
  chatId: String,          // Composite key: [userId1, userId2].sort().join("-")
  content: String,         // Message content
  upload: Buffer,          // File attachment (base64)
  seen: Boolean,           // Read status
  createdAt: Date,         // Timestamp
  updatedAt: Date          // Last modified
}
```

#### Socket Architecture
```typescript
// Current Socket.IO Setup
Namespace: /chat
Events:
- join_room: Join chat room by chatId
- send_message: Send message to room
- new_message: Broadcast new message to room
- disconnect: Handle user disconnection
```

#### API Endpoints
```typescript
// Current Chat API
GET /chat/conversations/:userId     // Get user's conversations
GET /chat/conversation/thread       // Get conversation messages
POST /chat/thread/seen             // Mark messages as read
POST /chat/send                    // Send new message
```

### Security Considerations

1. **Authentication**: All messaging endpoints require valid JWT tokens
2. **Authorization**: Users can only access their own conversations
3. **Input Validation**: Message content and file uploads are validated
4. **Rate Limiting**: Implement rate limiting for message sending
5. **Data Sanitization**: Sanitize message content to prevent XSS

### Performance Optimizations

1. **Caching Strategy**: Leverage existing Redis caching for user profiles and conversations
2. **Message Pagination**: Implement pagination for message history
3. **Connection Pooling**: Optimize database connections for real-time messaging
4. **File Upload Limits**: Implement size and type restrictions for attachments

### Success Criteria

1. **Functional Requirements**:
   - Students can subscribe to tutors and automatically get chat access
   - Messages page displays all subscribed tutor conversations
   - Real-time messaging works between students and tutors
   - Message history loads correctly for each conversation
   - Online/offline status displays accurately

2. **Performance Requirements**:
   - Message sending/receiving < 100ms latency
   - Conversation loading < 500ms
   - Support for 100+ concurrent users
   - 99.9% uptime for messaging system

3. **Security Requirements**:
   - All messages encrypted in transit
   - Proper authentication and authorization
   - Input validation and sanitization
   - Rate limiting and abuse prevention

### Implementation Timeline

- **Phase 1**: 2-3 days (Core functionality)
- **Phase 2**: 1-2 days (Profile pictures & data flow)
- **Phase 3**: 2-3 days (Socket management)
- **Phase 4**: 1-2 days (Message history)
- **Phase 5**: 1-2 days (UI improvements)

**Total Estimated Time**: 7-12 days

### Next Steps

1. Begin with Phase 1 implementation
2. Test each phase thoroughly before proceeding
3. Maintain backward compatibility with existing features
4. Document any changes to the API or database schema
5. Implement proper error handling and logging

This implementation plan ensures a secure, performant, and user-friendly messaging system that meets business standards while providing an excellent user experience for students and tutors on the CampusLearn platform.
