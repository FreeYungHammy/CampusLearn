# Gemini - AI Software Engineer

This document outlines my understanding of the CampusLearn project and my role as an AI software engineer for the next 8 weeks.

## Project Overview

CampusLearn is a full-stack web application with a React frontend and a Node.js/Express backend. It appears to be an educational platform that connects students and tutors.

### Key Technologies

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Axios, Socket.IO Client, Zustand
- **Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Socket.IO, bcrypt
- **Architecture:** Monorepo with `frontend` and `backend` workspaces.

### Core Features

- User authentication (login/registration)
- Tutor discovery and profiles
- Forum for discussions
- Real-time chat between users
- File uploads

## My Role

As an AI software engineer on this project, my primary responsibilities will be:

- **Code Refactoring:** Improving the existing codebase for clarity, performance, and maintainability.
- **Feature Development:** Assisting in the implementation of new features as requested.
- **Bug Fixes:** Identifying and resolving issues within the application.
- **Code Analysis:** Providing insights and explanations of the current codebase.
- **Automation:** Assisting with scripts and tooling to improve the development workflow.

I will strive to adhere to the existing coding conventions and best practices of the project. I look forward to collaborating with the team over the next 8 weeks.

## Code Deep Dive & Snapshots

To ensure continuity between sessions, here is a more detailed snapshot of the application's architecture and key code pathways.

### Backend

The backend is an Express.js application.

**Startup Process (`server.ts` -> `app.ts`):**

1.  `server.ts` is the main entry point, which calls the `boot()` function from `app.ts`.
2.  The `boot()` function in `app.ts` establishes a connection to MongoDB via `connectMongo()`.
3.  `app.ts` configures the Express app with middleware for CORS, JSON parsing, and then sets up the API routes.
4.  The server starts listening for requests.

**API Routing (`app.ts` -> `routes/index.ts` -> modules):**

- The main application (`app.ts`) forwards all requests starting with `/api` to the main router in `routes/index.ts`.
- This main router then delegates to modular routers for different resources.

### Frontend

The frontend is a React application built with Vite.

**Startup Process (`main.tsx`):**

1.  `main.tsx` is the entry point.
2.  It renders the `RouterProvider` from `react-router-dom`, which manages the application's routing.
3.  The core application component is `<App />`, which likely contains the main layout and shared components.

### Authentication Flow (Login/Register)

**Registration (`POST /api/users/register`):**

1.  **Validation:** The incoming user's email is validated to ensure it ends with `@student.belgiumcampus.ac.za`. If not, a `400 Bad Request` error is returned.
2.  **Duplicate Check:** The database is checked to see if a user with that email already exists. If so, a `409 Conflict` error is returned.
3.  **Password Hashing:** The user's plain-text password is securely hashed using `bcrypt` with a cost factor of 10.
4.  **User Creation:** A new `User` document is created with the email, hashed password, and role.
5.  **Profile Creation:**
    - If the role is `student`, a corresponding `Student` document is created with the user's name and selected subjects (stored as `enrolledCourses`).
    - If the role is `tutor`, a `Tutor` document is created with the user's name and selected subjects.
6.  **Response:** A success response is sent to the frontend.

**Login (`POST /api/users/login`):**

1.  **User Lookup:** The system finds the user by email, retrieving the stored `passwordHash`.
2.  **Password Comparison:** `bcrypt.compare` is used to securely check if the provided password matches the stored hash.
3.  **JWT Generation:** On success, a JSON Web Token (JWT) is generated containing the user's ID, role, and email. The token is set to expire in 30 minutes.
4.  **Response:** The JWT and public user information are returned to the frontend.

**Logout (`POST /api/users/logout`):**

1.  **Frontend Trigger:** The user initiates logout from the UI (e.g., by clicking a logout button).
2.  **Confirmation Modal:** A confirmation modal appears to prevent accidental logout.
3.  **API Call:** If confirmed, the frontend sends a request to the `/api/users/logout` endpoint.
4.  **Cookie Removal:** The backend clears the JWT cookie.
5.  **State Update:** The frontend removes the user's authentication token and user data from the global state, redirecting them to the login page.

## Session Log

### Session 1: Initial Setup, Debugging, and Registration Implementation

- **Initial Analysis:** Analyzed the project structure, dependencies, and core files to gain a comprehensive understanding of the full-stack application. Created this `gemini.md` file to document my understanding.
- **Backend Debugging:**
  - Resolved a server startup crash by creating a `.env` file and setting the required `JWT_SECRET`.
  - Fixed multiple TypeScript compilation errors (`TS2790`) in all schema files by replacing the `delete` operator with a type-safe destructuring method in `toJSON` transforms.
  - Resolved a `net::ERR_CONNECTION_REFUSED` error by correcting the backend port from `5000` to `5001` in the frontend's API configuration.
  - Diagnosed and fixed a database connection issue by adding the correct MongoDB Atlas URI (including the database name `campuslearn`) to the `.env` file, resolving a `MongoServerError` related to database/collection name casing.
  - Fixed a series of compilation errors (`TS2339`, `TS2551`) by implementing missing static methods (`findByUserId`, `searchBySubject`, etc.) and their corresponding type definitions in the `tutor.schema.ts` file.
- **Frontend Development:**
  - Replaced the existing registration page with a new, more detailed component based on user-provided HTML (`newregister.html`).
  - Integrated the new HTML structure into a React component (`Register.tsx`), adding state management for all form fields.
  - Ensured the new page's styling and layout matched the existing `Login.tsx` page, including making the container progressively wider based on user feedback.
  - Fixed an issue where selection buttons had no visual feedback by centralizing all component styles into the shared `Login.css` file.
- **Feature Implementation (Registration Logic):**
  - Implemented the full-stack registration feature.
  - **Backend:** Updated the `user.service.ts` and `user.controller.ts` to handle user and profile (student/tutor) creation, password hashing, duplicate email checks, and custom email domain validation (`@student.belgiumcampus.ac.za`).
  - **Frontend:** Connected the `Register.tsx` component to the new backend endpoint, providing full error handling and success navigation.

### Session 2: Logout Functionality and UI Enhancements

- **Backend (JWT and Logout):**
  - Configured JSON Web Token (JWT) to expire after 30 minutes of inactivity in `backend/src/auth/jwt.ts`.
  - Implemented a new logout route (`/api/users/logout`) that clears the JWT cookie, effectively logging out the user on the server side.
- **Frontend (Logout and Inactivity):**
  - Created a `logout` function in the frontend API service (`frontend/src/services/authApi.ts`) to communicate with the new backend endpoint.
  - Updated the Zustand auth store (`frontend/src/store/authStore.ts`) with a `logout` action to clear the user's authentication state from the application.
  - Added a "Logout" button to the main `Header.tsx` component, which now triggers the logout process.
  - Implemented an automatic logout feature using a custom hook (`useInactivityLogout.ts`) that logs the user out after 30 minutes of inactivity (no mouse movement or key presses).
- **Frontend (UI Enhancements):**
  - Introduced a full-screen, modern confirmation modal (`LogoutConfirmationModal.tsx`) that appears when the user clicks the logout button. This prevents accidental logouts and improves user experience.
  - The modal is rendered as an overlay on the entire application, creating a 3D effect and focusing the user's attention.
  - The modal's visibility is managed through the global Zustand store, ensuring a clean and centralized state management approach.

### Session 3: Default Profile Picture Implementation

- **Backend (Profile Picture):**
  - Updated `students.schema.ts` and `tutor.schema.ts` to include a `pfp` field for storing the profile picture.
  - Modified `user.service.ts` to set a default profile picture for new users upon registration. The default image is read from a file at runtime.
  - Updated the `login` function in `user.service.ts` to include the `pfp` data in the user object returned to the frontend.
- **Frontend (Profile Picture):**
  - Updated the `User` type in `frontend/src/types/Users.ts` to include the `pfp` field.
  - Modified the `Header.tsx` component to dynamically display the user's profile picture from the database. If no profile picture is available, a default avatar is shown.

### Session 4: File Upload Feature Implementation (Initial Attempt & Debugging)

- **Goal:** Implement file upload functionality for tutors, allowing them to upload learning materials.
- **Backend Implementation (Initial):**
  - **Schema (`backend/src/schemas/tutorUpload.schema.ts`):** Defined a `FileSchema` to store file metadata (tutorId, subject, subtopic, title, description, contentType) and the binary `content` of the file. The `description` field was made `required` to align with frontend validation. The `content` field was set to `select: false` for performance optimization.
  - **Repository (`backend/src/modules/files/file.repo.ts`):** Created a repository for CRUD operations on the `File` model.
  - **Service (`backend/src/modules/files/file.service.ts`):** Implemented the business logic for file creation, including determining the `contentType` using `mime-types` based on the file's original name. Also included methods for listing, retrieving (with/without binary content), updating, and deleting files.
  - **Controller (`backend/src/modules/files/file.controller.ts`):** Created a controller to handle API requests for file operations. Integrated `multer` for handling `multipart/form-data` file uploads. Added endpoints for creating, listing, retrieving (meta and binary), updating, and deleting files.
  - **Routes (`backend/src/modules/files/index.ts`):** Configured routes to expose the file API endpoints.
- **Frontend Implementation (Initial `Upload.tsx`):**
  - Implemented the UI for file uploads, including drag-and-drop functionality, file selection, and input fields for title, subject, subtopic, and description.
  - Added client-side validation to ensure all fields are filled before submission. The title is automatically populated from the filename (without extension).
  - Integrated `useAuthStore` to get the `tutorId` for file uploads.
  - Added `isSubmitting` state to provide visual feedback during upload and prevent multiple submissions.
  - Implemented basic success and error message display after API calls.
- **Challenges and Lessons Learned (Initial Attempt):**
  - **Frontend White Screen/Rendering Issues:** Repeatedly encountered a white screen on the frontend after implementing file upload features. This was primarily due to:
    - **Incorrect component integration:** Attempting to render `UploadedFiles` component before it was fully stable or correctly integrated, leading to rendering errors.
    - **Dependency issues/Circular dependencies:** Potential issues with how `useAuthStore` or `api` were being used or imported, causing the application to crash during rendering.
    - **Unstable development practices:** Moving too quickly between features without thorough testing at each step, leading to cascading errors that were difficult to debug.
  - **Backend Submission Failures:** Initial attempts to submit files to the database resulted in the frontend showing "Submitting..." but no data appearing in MongoDB Atlas. This was due to:
    - **Syntax errors in backend service:** A missing parenthesis in `file.service.ts` caused the backend TypeScript compilation to fail, preventing the server from starting correctly and thus blocking any API calls.
    - **Lack of immediate feedback:** The frontend was not adequately configured to display specific backend errors, making debugging difficult.
  - **Lesson Learned:** For complex feature implementations, especially those involving both frontend and backend changes, a more granular, step-by-step approach with frequent testing is crucial. Prioritize application stability over rapid feature development. Ensure robust error handling and clear user feedback on both ends of the application. Thoroughly test each new piece of functionality in isolation before integrating it into the larger system. Always verify backend compilation and server startup after any backend code changes.

### Session 5: File Upload Feature (Successful Implementation & Refinements)

- **Problem Diagnosis:** Despite initial backend implementation, file uploads were not persisting to the database, and no backend logs were appearing. This indicated the issue was occurring _before_ the service layer.
  - **Root Cause 1: Missing API Call in Frontend:** The `handleSubmit` function in `frontend/src/pages/Upload.tsx` was found to be only logging form data to the console and _not_ making an actual API call to the backend. This was the primary reason no network requests were observed and no backend logs were generated.
  - **Root Cause 2: Incorrect MongoDB URI (Subtle):** The `mongoUri` in `backend/src/config/env.ts` was missing the explicit database name (`/campuslearn`) in its path, causing Mongoose to connect to a default database instead of the intended `campuslearn` database.
  - **Root Cause 3: Missing Backend Dependency:** The `multer` package, essential for handling `multipart/form-data` on the backend, was missing from `backend/package.json`.

- **Solutions Implemented:**
  - **Frontend API Integration:** Modified `frontend/src/pages/Upload.tsx` to:
    - Import `api` from `../lib/api` and `useAuthStore` from `../store/authStore`.
    - Get the `tutorId` from the authenticated user.
    - Update the `handleSubmit` function to be `async`.
    - Construct a `FormData` object containing all form fields (title, subject, subtopic, description) and the selected file.
    - Append the `tutorId` to the `FormData`.
    - Make an `api.post('/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } })` call to the backend.
    - Added `try...catch` blocks for robust error handling and success feedback (alerts, form clearing).
    - Implemented `isSubmitting` state to disable the upload button during the API call.
  - **Backend Dependency Installation:** Added `multer` to `backend/package.json` and `@types/multer` to `devDependencies`, then ran `npm install` from the monorepo root.
  - **Backend `mongoUri` Correction:** Updated `backend/src/config/env.ts` to explicitly include `/campuslearn` in the `mongoUri` path, ensuring connection to the correct database.
  - **Backend Controller Refinement:** Modified `backend/src/modules/files/file.controller.ts` to ensure `mimetype` from `req.file` is passed to the service layer for accurate `contentType` storage.
  - **Backend Service Refinement:** Modified `backend/src/modules/files/file.service.ts` to use the more reliable `input.file.mimetype` for `contentType` and updated its type definition.
  - **Backend Logging:** Added detailed logging to `backend/src/modules/files/file.service.ts` and `backend/src/modules/files/file.repo.ts` to trace the file upload process (e.g., "Received request to create file.", "Attempting to save file document to MongoDB...", "File document saved successfully to MongoDB.").

- **Current System Functionality (File Uploads):**
  - The system now successfully allows tutors to upload learning materials.
  - Files are stored as **binary data (`Buffer`)** in the `files` collection of the `campuslearn` database in MongoDB Atlas.
  - Each file document includes metadata (tutorId, subject, subtopic, title, description, contentType) and the binary `content`.
  - Files can be retrieved via a dedicated binary endpoint (`/api/files/:id/binary`), which serves the file with the correct `Content-Type` header, allowing browsers to display or download them appropriately.
  - **Important Consideration:** Due to MongoDB's 16MB document size limit, very large files may not be stored successfully. For production systems handling large files, external storage solutions (e.g., cloud storage like AWS S3) are typically recommended, with only file references stored in MongoDB.

- **Lesson Learned:** Thoroughly verifying frontend API calls and backend database connection strings are critical early debugging steps. Incremental development with frequent testing and robust logging significantly aids in identifying and resolving issues in complex full-stack features.

### Session 6: Display of File Content (Tutor View)

- **Goal:** Implement the "My Content" page for tutors to view and manage their uploaded files in a structured, folder-like interface.

- **Backend Plan:**
  - **Secure Endpoint:** Create a new, secure endpoint `GET /api/files/my-content`. This endpoint will use the JWT token to identify the logged-in tutor and fetch only their files, preventing unauthorized access.
  - **Performance Optimization:** The database query for this endpoint will be optimized using `.select('-content')` to exclude the heavy binary file data, ensuring the page loads quickly by only fetching lightweight metadata.

- **Frontend Plan:**
  - **Routing:** Add a new protected route `/my-content` in `frontend/src/routes/index.tsx` that renders the `MyContent.tsx` component, ensuring it's only accessible to logged-in users.
  - **API Service:** Create a new file `frontend/src/services/fileApi.ts` containing a `getMyContent()` function to call the new backend endpoint.
  - \*\*UI Implementation (`MyContent.tsx`):
    - **Styling:** The UI will be built using the modern and polished CSS classes and design patterns found in `demo.html` (specifically `.content-browser`, `.subject-item`, `.file-item`, etc.).
    - **Component Structure:** The display will be built using a modular, component-based approach (`SubjectFolder.tsx`, `SubtopicFolder.tsx`, `FileItem.tsx`) to keep the code clean and maintainable.
    - **Display Logic:** The core logic for displaying content will be as follows:
      1.  **Fetch:** Get the flat list of all files belonging to the tutor from the new API endpoint.
      2.  **Process Subjects:** Identify the unique subjects from the file list to create the top-level "folders".
      3.  **Process Subtopics:** For each subject, identify the unique subtopics within it to create the second-level "folders".
      4.  **Group & Render:** Group the files under their corresponding `Subject > Subtopic` path and render the interactive, expandable folder structure.

#### Session 6 – Phase 1 (Implemented)

- Implemented the "My Content" tutor view end-to-end focusing on functionality first.
- Backend:
  - Added `/api` root responder for clearer API liveness checks.
  - Added `GET /api/files/my-content` (secured via `requireTutor`) for the final design.
  - For functionality-first, added public endpoints:
    - `GET /api/files/by-user/:userId` → returns files for the tutor owning this user. Handles legacy data by querying both `tutorId = userId` and `tutorId = tutor._id`.
    - `GET /api/files/by-tutor/:tutorId` → returns files for a specific tutor.
  - Hardened ObjectId handling (sanitizes `userId` values like `<...>`), and returns meta only (no binary).
- Frontend:
  - `MyContent.tsx` fetches with a fallback strategy:
    1. `/files/by-user/:userId`; if empty →
    2. `/tutors/by-user/:userId` then `/files/by-tutor/:tutorId`.
  - Groups files by Subject → Subtopic and renders with demo.html classes (`.content-browser`, `.subject-item`, `.subtopic-item`, `.file-item`).
  - Download buttons hit `/api/files/:id/binary` using a robust, resolved base URL.

Result: Tutors with uploaded content now see their materials organized by subject and subtopic; downloads work.

#### Session 6 – Phase 2 (Pending)

- **UI polish and readability:**
  - Improve empty/error states and loading skeletons.
  - Add icons by file type, file size/date metadata, and truncation/tooltip for long titles.
  - Expand/collapse folders with smooth transitions; breadcrumbs that drill into Subject/Subtopic.
- **Route protection and security:**
  - Enforce JWT via `requireTutor` for `/api/files/my-content` and remove public convenience endpoints once UI is stable.
  - On the frontend, gate `/mycontent` for tutor role and add redirect for non-tutors.
  - Pass Bearer token automatically from the store for secured endpoints.

- **Next Steps (Phase 2):**
  - Once the display functionality is complete and approved, the next phase will be to implement the file deletion feature, which will include a secure backend endpoint and a confirmation modal on the frontend.
