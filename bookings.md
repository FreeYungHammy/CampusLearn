# Final Plan: Additive Booking Request System

This document outlines the final, approved plan to add a booking request system to the existing booking module. This plan respects all existing, working code and focuses on additive changes.

---

## Feature Overview and Context

The core problem this feature solves is that the old system allowed students to instantly book a tutor's time without explicit approval. This new system transforms the process into a professional, request-based workflow, giving tutors control over their schedule.

When a student creates a booking, it is now treated as a **pending application**. Tutors can then **accept**, **reject**, **complete**, or **cancel** these bookings. This provides a full lifecycle management for appointments.

---

## Phase 1: Backend - Additive Implementation

**Guiding Principle:** All existing, working methods like `create` and `checkAvailability` in `BookingService` will be preserved and utilized. The following changes are additions to enable the new workflow.

### 1.1. Schema (`booking.schema.ts`)

- **Action:** No changes are required. The existing schema with `status: 'pending'` and `status: 'confirmed'` already supports the application/approval flow perfectly. We will use `'confirmed'` to represent an `'accepted'` booking.

### 1.2. Router Enhancements (`index.ts`)

- **Action:** Add three new routes to the existing router file for the new tutor and cancellation actions. The existing `POST /` route will continue to be used for creating the initial booking application (`pending` booking).

- **Code to Add to `backend/src/modules/bookings/index.ts`:**

```typescript
// ADD THESE NEW ROUTES FOR BOOKING LIFECYCLE MANAGEMENT
r.patch("/:id/accept", requireAuth, BookingController.acceptBooking);
r.delete("/:id/reject", requireAuth, BookingController.rejectBooking);
r.patch("/:id/complete", requireAuth, BookingController.completeBooking);
```

- **Note on Cancellation:** The existing `PATCH /:id/cancel` route will be used. Its logic in the service layer will be reviewed to ensure both student and tutor can perform the action.

### 1.3. Controller Additions (`booking.controller.ts`)

- **Action:** Add the corresponding new methods to the `BookingController` object.

- **Code to Add to `BookingController`:**

```typescript
  async acceptBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.acceptBooking(req.params.id, req.user!);
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  },

  async rejectBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      await BookingService.rejectBooking(req.params.id, req.user!);
      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  },

  async completeBooking(req: AuthedRequest, res: Response, next: NextFunction) {
    try {
      const booking = await BookingService.completeBooking(req.params.id, req.user!);
      res.status(200).json(booking);
    } catch (error) {
      next(error);
    }
  },
```

### 1.4. Service Layer Additions (`booking.service.ts`)

- **Action:** Add new methods to the `BookingService` to handle the new business logic. The existing `create` and `checkAvailability` methods will not be modified.

- **Code to Add to `BookingService`:**

```typescript
  async acceptBooking(bookingId: string, user: User): Promise<BookingDoc> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorRepo.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "You are not authorized to accept this booking.");
    }

    if (booking.status !== 'pending') {
      throw new HttpException(400, "This booking is not pending and cannot be accepted.");
    }

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();
    return booking;
  },

  async rejectBooking(bookingId: string, user: User): Promise<void> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorRepo.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "You are not authorized to reject this booking.");
    }

    if (booking.status !== 'pending') {
      throw new HttpException(400, "This booking is not pending and cannot be rejected.");
    }

    await BookingModel.findByIdAndDelete(bookingId);
  },

  async completeBooking(bookingId: string, user: User): Promise<BookingDoc> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new HttpException(404, "Booking not found.");

    const tutor = await TutorRepo.findByUserId(user.id);
    if (!tutor || user.role !== 'tutor' || booking.tutorId.toString() !== tutor._id.toString()) {
      throw new HttpException(403, "Only tutors can complete a booking.");
    }

    if (booking.status !== 'confirmed') {
      throw new HttpException(400, "Only confirmed bookings can be marked as complete.");
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();
    return booking;
  },
```

---

## Phase 2: Frontend - Calendar UI & Integration

### 2.1. Detailed Frontend Logic and Data Flow

This section details how the frontend will handle the booking data to render the calendar view.

**1. Data Fetching:** The `Bookings.tsx` component will make a `GET` request to the `/api/bookings` endpoint. The API will return an array of booking objects. Based on your example, a single object in that array will look like this:

```json
{
  "_id": { "$oid": "68dd6097f74440e19152aeeb" },
  "studentId": { "$oid": "68dab44897cfddfde1370918" },
  "tutorId": { "$oid": "68d55767f3b98c3827e71a76" },
  "date": "2025-10-02",
  "time": "19:00",
  "duration": 60,
  "subject": "Database Development",
  "status": "pending",
  "//": "...other fields..."
}
```

**2. Data Transformation for Calendar:** The frontend will map over this array and transform each booking object into an `event` object that the `@fullcalendar/react` library can display. For the example above:

- `title`: Becomes `"Database Development"` (from `booking.subject`)
- `start`: Becomes `new Date("2025-10-02T19:00")` (from combining `booking.date` and `booking.time`)
- `end`: Becomes `new Date("2025-10-02T20:00")` (calculated by adding `booking.duration` to the `start` time)
- `extendedProps`: This special property will hold the **entire original booking object**. This is how we keep track of the `status` and other important data.

**3. Color-Coding Logic:** The calendar component uses a function prop called `eventPropGetter`. This function is called for every event and lets us apply custom styles. The logic will be:

   - Read the status from `event.extendedProps.status`.
   - If `status` is `'pending'`, return a style object with `backgroundColor: '#facc15'` (Yellow).
   - If `status` is `'confirmed'`, return a style object with `backgroundColor: '#4ade80'` (Green).
   - If `status` is `'completed'`, return a style object with `backgroundColor: '#60a5fa'` (Blue).

**4. Modal Interaction:** The calendar has an `eventClick` handler. When a user clicks an event:

   - The function will retrieve the full booking data from `event.extendedProps`.
   - This data will be saved into a React state variable.
   - This state change will trigger the `BookingDetailsModal` to open and display the correct details and action buttons (Accept, Reject, Cancel, etc.) based on the user's role and the booking's status.

### 2.2. File Creation and Routing

- A new page will be created at `frontend/src/pages/Bookings.tsx`.
- A new component will be created at `frontend/src/components/BookingDetailsModal.tsx`.
- A new route `{ path: "bookings", element: <BookingsPage /> }` will be added to `frontend/src/routes/index.tsx`.

---

## Phase 3: Real-Time Notifications (Future Implementation)

This phase will make the UI fully reactive using WebSockets and will be implemented later.