# Tutor Application and Review System: Implementation Plan

This document outlines the complete, multi-phase plan for implementing a robust system for handling and reviewing tutor applications. The core principle of this system is that no user account is created for a tutor until their application has been explicitly approved by an administrator.

## Core Workflow

1.  A prospective tutor fills out an application form, providing their personal details, subject expertise, a password, and a PDF qualification document.
2.  This submission creates an "application" document in a dedicated `tutorapplications` collection in the database. **No `User` account is created at this stage.**
3.  An administrator views a list of pending applications in a secure dashboard.
4.  The admin can view the full details of each application, including the PDF transcript rendered in an `iframe`.
5.  The admin can either **Approve** or **Reject** the application.
    *   **On Approval:** The system creates a new `User` account and a new `Tutor` profile, then deletes the application document.
    *   **On Rejection:** The system simply deletes the application document.

---

## Phase 1: Backend - Application Schema and Submission Endpoint

**Goal:** To create the backend infrastructure for receiving and storing tutor applications without creating user accounts.

1.  **Create `TutorApplication` Schema:**
    *   **File:** `backend/src/schemas/tutorApplication.schema.ts`
    *   **Details:** This new Mongoose schema will define the structure for the `tutorapplications` collection.
    *   **Fields:**
        *   `firstName`: `String`
        *   `lastName`: `String`
        *   `email`: `String` (unique)
        *   `passwordHash`: `String` (to securely store the applicant's chosen password)
        *   `subjects`: `[String]`
        *   `qualificationFile`: An object containing:
            *   `data`: `Buffer` (for the PDF content)
            *   `contentType`: `String` (will be `application/pdf`)
        *   `submittedAt`: `Date`

2.  **Create New Public API Endpoint for Submissions:**
    *   **Endpoint:** `POST /api/applications/tutor`
    *   **Functionality:**
        *   This endpoint will be responsible for handling new tutor application submissions.
        *   It will use the `multer` middleware to process the `multipart/form-data`, specifically for the PDF upload.
        *   It will securely hash the provided password using `bcrypt`.
        *   It will then create and save a new document to the `tutorapplications` collection.

---

## Phase 2: Frontend - Update Registration Logic

**Goal:** To adapt the frontend registration form to use the new application submission process for tutors.

1.  **Modify `RegisterStepperModal.tsx`:**
    *   **File:** `frontend/src/components/RegisterStepperModal.tsx`
    *   **Logic Change:** The `onSubmit` handler for the form will be updated to differentiate between student and tutor registrations.
        *   **If `role` is "student":** The form will call the existing `register` service, which creates a `User` and `Student` profile immediately.
        *   **If `role` is "tutor":** The form will be re-wired to send its data (including the PDF file) to the new `POST /api/applications/tutor` endpoint. It will **not** create a user account.

---

## Phase 3: Backend - Admin Review Endpoints

**Goal:** To build the secure API endpoints that the admin dashboard will use to manage the applications.

1.  **Create New `tutorApplication` Module:**
    *   **Directory:** `backend/src/modules/tutor-applications/`
    *   **Contents:** This will house the new `controller` and `service` files required for this feature.

2.  **Implement Admin-Only API Endpoints:**
    *   `GET /api/tutor-applications`:
        *   **Access:** Admin only.
        *   **Action:** Fetches all documents from the `tutorapplications` collection to display the list of pending applications.
    *   `GET /api/tutor-applications/:id/pdf`:
        *   **Access:** Admin only.
        *   **Action:** Retrieves and serves the raw PDF file (`Buffer`) for a specific application, allowing it to be rendered in an `iframe`.
    *   `POST /api/tutor-applications/:id/approve`:
        *   **Access:** Admin only.
        *   **Action:**
            1.  Retrieves the specified application document.
            2.  Creates a new `User` document using the stored `email` and `passwordHash`.
            3.  Creates a new `Tutor` document, linking it to the new `User`.
            4.  Deletes the application document from the `tutorapplications` collection.
    *   `DELETE /api/tutor-applications/:id`:
        *   **Access:** Admin only.
        *   **Action:** Deletes the specified application document from the `tutorapplications` collection, effectively rejecting it.

---

## Phase 4: Frontend - Admin Dashboard UI

**Goal:** To create the user interface for administrators to review and process applications.

1.  **Create "Tutor Applications" Admin Page:**
    *   **Location:** A new route and component within the admin section of the frontend.
    *   **Functionality:**
        *   On load, it will call `GET /api/tutor-applications` to fetch and display a list of all pending applications.
        *   Each item in the list will have a "View" button.

2.  **Implement the Application Review Modal/View:**
    *   **Functionality:**
        *   Triggered by the "View" button.
        *   Displays all of the applicant's information (name, email, subjects).
        *   Contains an `<iframe>` element whose `src` attribute is set to the `GET /api/tutor-applications/:id/pdf` endpoint to display the qualification document.
        *   Includes "Approve" and "Reject" buttons.

3.  **Connect UI to API:**
    *   The "Approve" button will trigger a call to the `POST /api/tutor-applications/:id/approve` endpoint.
    *   The "Reject" button will trigger a call to the `DELETE /api/tutor-applications/:id` endpoint.
    *   Upon successful completion of either action, the UI will update (e.g., by closing the modal and refreshing the list) to reflect that the application has been processed and removed from the queue.

---

## Progress Update (As of End of Day)

### Completed Work: Backend Foundation

- **Phase 1 & 3 (Backend) are complete.**
- The new `TutorApplication` schema has been created and saved in `backend/src/schemas/tutorApplication.schema.ts`.
- The entire backend module for handling applications is in place at `backend/src/modules/tutor-applications/`.
  - This includes the `controller` for handling API requests and the `service` for business logic.
- All necessary API endpoints have been defined and routed in `backend/src/routes/index.ts` under the `/api/applications` path:
  - `POST /tutor`: For submitting a new application.
  - `GET /`: For admins to list all pending applications.
  - `GET /:id` and `GET /:id/pdf`: For admins to retrieve application details and the PDF document.
  - `POST /:id/approve`: To approve an application.
  - `DELETE /:id`: To reject an application.
- The `requireAdmin` authentication middleware was missing and has been created and applied to the admin-only routes, resolving a compilation error.

### Next Steps: Frontend Integration

- **Phase 2 & 4 (Frontend) are the next focus.**
- The immediate next step is to create a new `submitTutorApplication` function in the frontend's `authApi.ts` service.
- After that, the `RegisterStepperModal.tsx` component must be modified to call this new function for tutor registrations, separating its logic from the student registration process.
- Once the frontend is correctly submitting applications to the backend, the final phase will be to build the admin dashboard UI for reviewing them.
