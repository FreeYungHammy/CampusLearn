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

## Future Architectural Strategy

### Redis Integration

The application leverages Redis as a robust caching layer to significantly enhance read performance, reduce the load on the primary MongoDB database, and improve overall application responsiveness.

**Key Principles Guiding Caching:**
*   **High Read-to-Write Ratio:** Prioritizing data frequently accessed.
*   **Low Volatility:** Focusing on data that changes infrequently.
*   **Small Data Footprint:** Ensuring individual cached items and the aggregate dataset remain within limits.
*   **Consistency Tolerance:** Utilizing TTLs for data that can tolerate slight staleness.
*   **Security:** Employing Redis for secure JWT blacklisting.

**Implemented Caching Strategy (Redis - Server-Side):**

*   **User & Profile Metadata:**
    *   **Cached:** Individual `User`, `Student`, and `Tutor` objects (metadata only, *excluding* PFP data).
    *   **Keys:** `user:<id>`, `student:<id>`, `student:user:<userId>`, `tutor:<id>`, `tutor:user:<userId>`.
    *   **TTL:** 30 minutes (1800 seconds).
    *   **Invalidation:** On any update, creation, or deletion of the respective user/profile.
*   **Profile Pictures (PFPs):**
    *   **Cached:** Individual profile picture data (as base64 strings).
    *   **Key:** `pfp:user:<userId>`.
    *   **TTL:** 30 minutes (1800 seconds).
    *   **Invalidation:** On PFP update.
    *   **Benefit:** Speeds up dedicated PFP endpoint (`/api/users/:userId/pfp`) by serving images from memory, reducing MongoDB load.
    *   **Negative Caching:** `null` results (for users without a PFP) are also cached for a shorter duration (5 minutes) to prevent repeated database lookups for non-existent data.
*   **Tutor List (Find Tutors Page):**
    *   **Strategy:** The global `tutors:all` list cache has been removed. The `TutorService.list()` method fetches the list directly from MongoDB. This method *does not* return PFP data; PFPs are fetched separately by the client.
    *   **Cache Warming:** Individual tutor profiles are proactively updated in the cache (`tutor:<id>`), ensuring fast subsequent access to individual tutor details.
*   **Forum Threads:**
    *   **Cached:** The main forum thread list and individual forum thread objects (metadata only, *excluding* author PFP data). The `ForumService.getThreads()` and `ForumService.getThreadById()` methods *do not* return PFP data; PFPs are fetched separately by the client.
    *   **Keys:** `forum:threads:all`, `forum:thread:<threadId>`.
    *   **TTL:** 15 minutes (900 seconds) for lists, 30 minutes (1800 seconds) for individual threads.
    *   **Invalidation:** On new thread creation or new reply, the relevant caches are invalidated.
*   **Subscribed Tutors List:**
    *   **Cached:** The list of tutors a student is subscribed to.
    *   **Key:** `subscriptions:student:<studentId>`.
    *   **TTL:** 30 minutes (1800 seconds).
    *   **Invalidation:** On subscription creation or deletion.
*   **JWT Blacklist:**
    *   **Cached:** Invalidated JWT tokens upon user logout.
    *   **Key:** `jwt:blacklist:<token>`.
    - **TTL:** Matches the original JWT expiry time.
    - **Purpose:** Provides immediate token revocation for security.

**Browser Caching (Client-Side):**

*   **Mechanism:** The backend sends `Cache-Control` HTTP headers (e.g., `Cache-Control: public, max-age=1800`) for static assets like profile pictures served from dedicated endpoints (`/api/users/:userId/pfp`).
*   **Benefit:** This instructs the user's web browser to store a local copy of the image. On subsequent visits to the same page or other pages displaying the same image, the browser serves the image directly from its local cache, eliminating the need for a network request to the server. This significantly improves perceived page load speed and reduces server load.
*   **Verification:** Browser caching can be verified using the browser's Developer Tools (Network tab). A successful cache hit will typically show a `200 OK (from memory cache)` or `304 Not Modified` status, indicating the asset was served from the local cache rather than re-downloaded.

**Overall Multi-Layered Caching Strategy:**

The application employs a multi-layered caching approach to optimize performance:
1.  **Browser Cache:** First line of defense, serving assets directly from the client's machine.
2.  **Redis Cache:** If not in browser cache, the request hits the server. Redis serves as a fast in-memory cache, protecting the primary database from repeated queries for frequently accessed data.
3.  **MongoDB:** The ultimate source of truth. Only accessed if data is not found in either the browser or Redis cache.

**Architectural Design Insights:**
*   **Centralized Cache Abstraction:** A dedicated `CacheService` encapsulates all Redis interactions.
*   **Service Layer Integration:** Caching logic is primarily integrated within the `service` layer.
*   **Consistent Key Naming:** Clear and consistent key naming conventions are used.
*   **Serialization:** Complex objects are serialized to JSON strings (with Buffers converted to base64 strings for PFPs) before storage and deserialized upon retrieval.
*   **Graceful Degradation:** Robust error handling ensures the application falls back to fetching data directly from MongoDB if Redis is unavailable.
*   **Monitoring:** Logging is in place to monitor Redis activity (hits, misses, sets, deletes) and retrieval times for performance analysis.

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
  - **UI Implementation (`MyContent.tsx`):**
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

### Session 7: Smart File Display and Download Logic

- **Goal:** Implement the "View" button that intelligently handles file rendering. For browser-viewable files (PDFs, images, text), it will display them in a modal. For other files (spreadsheets, documents), it will trigger a proper download with the correct file extension.

- **Problem Diagnosis:**
  - The primary issue was that the backend's `GET /api/files/:id/binary` endpoint was forcing a download for all file types by using `Content-Disposition: attachment`.
  - It also failed to append a file extension to the downloaded file, making it unusable without manual renaming.
  - The frontend was using a complex and insecure data-fetching method instead of the dedicated `getMyContent` service function.

- **Execution Plan:**
  - **Backend (`file.controller.ts`):**
    1.  **Import `mime-types`:** Utilize the already-installed `mime-types` package.
    2.  **Define Viewable Types:** Create a constant array `VIEWABLE_MIME_TYPES` (e.g., `application/pdf`, `image/png`, `text/plain`) to easily check if a file can be rendered by the browser.
    3.  **Update `getBinary` Endpoint:**
        - Dynamically determine the file extension using `mime.extension(contentType)`.
        - Construct a full, user-friendly `filename` (e.g., `My-Document.pdf`).
        - Check if the file's `contentType` is in the `VIEWABLE_MIME_TYPES` list.
        - Set the `Content-Disposition` header to `inline; filename="..."` for viewable files to instruct the browser to display them.
        - For all other file types, set the `Content-Disposition` to `attachment; filename="..."` to force a download.

  - **Frontend (`MyContent.tsx`):**
    1.  **State Management:** Introduce state to manage a modal's visibility and the URL of the currently selected file.
        ```typescript
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [selectedFile, setSelectedFile] = useState<TutorUpload | null>(
          null,
        );
        ```
    2.  **Refactor Data Fetching:** Replace the complex, multi-step data fetching logic in `useEffect` with a single, clean call to the `getMyContent(token)` function from `fileApi.ts`. This requires getting the auth token from the `useAuthStore`.
    3.  **UI and Logic:**
        - Rename the "Download" button to "View".
        - Create a `handleViewClick` function that accepts the `file` object.
        - Inside this function, check if the file's `contentType` is in the `VIEWABLE_MIME_TYPES` list.
        - **If Viewable:** Set the `selectedFile` in state and set `isModalOpen` to `true`.
        - **If Not Viewable:** Open the file's binary URL (`/api/files/:id/binary`) in a new tab, which will trigger the corrected download behavior from the backend.
    4.  **Modal Component:**
        - Implement a modal component that is displayed when `isModalOpen` is true.
        - The modal will contain an `iframe` whose `src` is set to the binary URL of the `selectedFile`.
        - Include a "Close" button on the modal to set `isModalOpen` to `false`.
        - Add a title to the modal displaying the file's name.

### Session 8: User Settings Implementation (Profile & Security)

- **Goal:** Implement the user settings page, allowing users to update their profile information (profile picture, name, surname) and change their password.

- **Backend Implementation:**
  - **Profile Picture Update:**
    - Created a new route `PATCH /api/users/pfp` protected by authentication.
    - Implemented a service function `updatePfp` that handles base64 image data, converts it to a Buffer, and updates the `pfp` field in the corresponding `Student` or `Tutor` document.
    - Increased the Express body parser's payload limit to `10mb` in `app.ts` to accommodate larger image uploads, fixing the `413 (Payload Too Large)` error.
  - **Profile Information Update:**
    - Created a new route `PATCH /api/users/profile` protected by authentication.
    - Implemented a service function `updateProfile` to update the `name` and `surname` fields in the `Student` or `Tutor` document.
  - **Password Update:**
    - Created a new route `PATCH /api/users/password` protected by authentication.
    - Implemented a service function `updatePassword` that:
      - Fetches the user with their password hash using a new `findByIdWithPassword` repository method.
      - Verifies the provided "current password" using `bcrypt.compare`.
      - Securely hashes the new password and updates the `passwordHash` in the `User` document.
  - **Repo and Schema Updates:**
    - Added an `update` static method to both the `Student` and `Tutor` schemas to correctly handle profile updates without breaking other repository methods, fixing a critical bug that caused the login to fail with a 500 error.
    - Added a `findByIdWithPassword` method to the `UserRepo` to securely fetch user data for password verification.

- **Frontend Implementation:**
  - **Centralized API Service (`settingsApi.ts`):**
    - Created a new `settingsApi.ts` service file to centralize all API calls related to user settings, promoting code organization and reusability.
    - Implemented `updateProfilePicture`, `updateProfile`, and `updatePassword` functions within this service.
  - **Settings Page (`Settings.tsx`):**
    - Connected the "Profile Information" form to the `updateProfile` API call.
    - Connected the "Change Picture" functionality to the `updateProfilePicture` API call, including state for loading and error handling.
    - Connected the "Change Password" form to the `updatePassword` API call, with clear success and error messaging for the user.
  - **Bug Fixing:**
    - Resolved a `net::ERR_INVALID_URL` error by ensuring that only the raw base64 data is stored in the frontend state, and the `data:image/...` prefix is correctly applied in the `<img>` tag's `src` attribute.
    - Fixed an initial `SyntaxError` by correcting the import statement for the `api` instance in `settingsApi.ts`.

- **Overall Result:** The settings page is now fully functional, allowing users to securely update their profile picture, name, and password with a clear and responsive user interface. The backend is robust, with dedicated, secure endpoints for each action.

### Forum Feature Implementation

### Forum Feature Implementation

The forum feature allows users (students and tutors) to create discussion threads, view existing threads, and post replies. It leverages a full-stack approach with real-time updates powered by WebSockets.

#### **1. Frontend: User Interaction and Display**

The frontend provides the user interface for interacting with the forum.

- **`frontend/src/pages/Forum.tsx`**:
  - This is the main forum page, displaying a list of all discussion threads.
  - It manages the visibility of the `CreatePostModal` using `useState`.
  - On component mount, it fetches existing threads using `getForumThreads()` from `forumApi.ts`.
  - It uses the `useForumSocket` hook to listen for `new_post` events, dynamically adding new posts to the displayed list in real-time.
  - Each thread is rendered as a `topic-card`, providing a link to the individual thread page (`/forum/:threadId`).
- **`frontend/src/components/forum/CreatePostModal.tsx`**:
  - A modal component that appears when the "New Topic" button is clicked on the `Forum.tsx` page.
  - It contains a form for users to input the post's `title`, `topic`, `content`, and an `isAnonymous` checkbox.
  - It uses local `useState` hooks to manage form input values.
  - Upon submission, it calls `createForumPost()` from `forumApi.ts`, passing the form data and the user's authentication token (obtained from `useAuthStore`).
  - After successful submission, it closes the modal and implicitly triggers a UI update on `Forum.tsx` via the WebSocket `new_post` event.
- **`frontend/src/pages/ForumTopic.tsx`**:
  - This page displays a single discussion thread and its associated replies.
  - It extracts the `threadId` from the URL parameters.
  - On component mount, it fetches the specific thread details using `getForumThreadById()` from `forumApi.ts`.
  - It uses the `useForumSocket` hook, passing the `threadId` to join the specific thread's WebSocket room. It then listens for `new_reply` events, dynamically adding new replies to the thread in real-time.
  - It includes a form for users to submit replies, calling `createForumReply()` from `forumApi.ts`.
- **`frontend/src/services/forumApi.ts`**:
  - This service centralizes all API calls related to the forum.
  - `createForumPost(postData, token)`: Sends a `POST` request to `/api/forum/threads` to create a new thread.
  - `getForumThreads()`: Sends a `GET` request to `/api/forum/threads` to retrieve all threads.
  - `getForumThreadById(threadId)`: Sends a `GET` request to `/api/forum/threads/:threadId` to retrieve a specific thread and its replies.
  - `createForumReply(threadId, replyData, token)`: Sends a `POST` request to `/api/forum/threads/:threadId/replies` to add a reply to a thread.
- **`frontend/src/hooks/useForumSocket.ts`**:
  - A custom React hook that manages the WebSocket connection to the backend.
  - It initializes a Socket.IO client connection to the backend's WebSocket URL.
  - If a `threadId` is provided (e.g., when viewing `ForumTopic.tsx`), it emits a `join_thread` event to the server, allowing the client to join a specific room for that thread.
  - It handles connection, disconnection, and error events for the WebSocket.
- **`frontend/src/types/Forum.ts`**:
  - Currently a placeholder (`// TODO: replace with real backend fields once forum API exists`). This file should be updated to reflect the actual `ForumPost` and `ForumReply` types defined in the backend schemas for better type safety across the application.

#### **2. Backend: API, Business Logic, and Data Persistence**

The backend handles the creation, retrieval, and management of forum posts and replies, interacting with the MongoDB database.

- **`backend/src/schemas/forumPost.schema.ts`**:
  - Defines the Mongoose schema for `ForumPost` documents.
  - Fields include `title`, `content`, `topic`, `authorId` (ObjectId), `authorRole` (enum: "student", "tutor"), `isAnonymous` (Boolean), `upvotes` (Number), and `replies` (an array of ObjectIds referencing `ForumReply` documents).
  - `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
- **`backend/src/schemas/forumReply.schema.ts`**:
  - Defines the Mongoose schema for `ForumReply` documents.
  - Fields include `postId` (ObjectId referencing `ForumPost`), `content`, `authorId`, `authorRole`, `isAnonymous`, and `upvotes`.
  - `timestamps: true` automatically adds `createdAt` and `updatedAt` fields.
- **`backend/src/modules/forum/index.ts`**:
  - This file sets up the Express router for all forum-related API endpoints.
  - It maps HTTP methods and paths to corresponding controller functions in `ForumController`.
  - `POST /threads`: `ForumController.createThread` (requires authentication via `requireAuth`).
  - `GET /threads`: `ForumController.getThreads`.
  - `GET /threads/:threadId`: `ForumController.getThreadById`.
  - `POST /threads/:threadId/replies`: `ForumController.createReply` (requires authentication).
- **`backend/src/modules/forum/forum.controller.ts`**:
  - Acts as the interface between the HTTP requests and the business logic in `ForumService`.
  - It extracts data from `req.body`, `req.params`, and `req.user` (from `AuthedRequest` after `requireAuth` middleware).
  - It calls the appropriate `ForumService` method and sends back the HTTP response (e.g., 201 Created, 200 OK, 404 Not Found, 500 Internal Server Error).
- **`backend/src/modules/forum/forum.service.ts`**:
  - Contains the core business logic for forum operations.
  - **`createThread(user, data)`**:
    - Identifies the author's profile (`Student` or `Tutor`) based on `user.role` and `user.id`.
    - Creates a new `ForumPost` document using `ForumPostModel.create()`.
    - After creation, it calls `getThreadById()` to fetch the newly created post with its author details populated.
    - Crucially, it then emits a `new_post` WebSocket event to all connected clients using `io.emit("new_post", populatedPost)`.
  - **`getThreads()`**:
    - Fetches all `ForumPost` documents from the database.
    - Performs **manual population** of author details: It collects all `authorId`s and `authorRole`s, then queries `StudentModel` and `TutorModel` in parallel to get the full author profiles. These profiles are then mapped back to the respective posts. This approach avoids deep population in Mongoose for potentially better performance.
  - **`getThreadById(threadId)`**:
    - Fetches a single `ForumPost` document by `threadId`.
    - It uses Mongoose's `.populate("replies")` to include all associated `ForumReply` documents.
    - Similar to `getThreads`, it performs **manual population** for the author of the main post and for each reply's author.
  - **`createReply(user, threadId, data)`**:
    - Identifies the author's profile.
    - Creates a new `ForumReply` document using `ForumReplyModel.create()`.
    - Updates the parent `ForumPost` document by pushing the new reply's `_id` into its `replies` array using `ForumPostModel.findByIdAndUpdate()`.
    - Emits a `new_reply` WebSocket event specifically to the room associated with the `threadId` using `io.to(threadId).emit("new_reply", populatedReply)`.
- **`backend/src/modules/forum/forum.repo.ts`**:
  - This file exists but is currently **empty**. The `ForumService` directly interacts with the Mongoose models (`ForumPostModel`, `ForumReplyModel`, `StudentModel`, `TutorModel`). While functional, this deviates from a strict repository pattern where `ForumRepo` would encapsulate all database interactions for forum entities.
- **`backend/src/routes/index.ts`**:
  - The main API router that registers the `/forum` route to use the forum-specific router.
- **`backend/src/config/socket.ts`**:
  - Initializes the Socket.IO server, attaching it to the main HTTP server.
  - Configures CORS for WebSocket connections.
  - Contains a `socket.on("join_thread", (threadId) => { socket.join(threadId); })` listener, which is crucial for the room-based real-time updates for replies.
  - Note: While this file sets up the socket server and generic listeners, the specific `new_post` and `new_reply` events are emitted directly from `forum.service.ts`.
- **`backend/src/app.ts`**:
  - The main Express application setup. It calls `connectMongo()` to establish the database connection and sets up middleware (CORS, JSON parsing) and routes. It passes the HTTP server to `createSocketServer` for WebSocket integration.

#### **3. WebSocket Integration: Real-time Communication**

The WebSocket implementation ensures that forum content updates instantly across all connected clients.

- **Server-Side Emission (`forum.service.ts`)**:
  - `io.emit('new_post', populatedPost)`: Broadcasts a newly created forum post to _all_ connected clients. This ensures that anyone on the main forum page sees the new thread appear immediately.
  - `io.to(threadId).emit('new_reply', populatedReply)`: Emits a new reply _only_ to clients who have joined the specific room identified by `threadId`. This means only users currently viewing that particular discussion thread will receive the real-time update for new replies.
- **Client-Side Listening (`useForumSocket.ts`, `Forum.tsx`, `ForumTopic.tsx`)**:
  - Clients connect to the Socket.IO server via `useForumSocket`.
  - `Forum.tsx` listens for `new_post` events to update its list of threads.
  - `ForumTopic.tsx` emits `join_thread` to join a specific thread's room and listens for `new_reply` events to update the replies section.

This comprehensive setup ensures a dynamic and interactive forum experience.

### Forum Planning

This section outlines the complete, multi-phase implementation plan for the forum feature.

#### **Phase 1: Frontend - "Create Post" Modal**

**Goal:** Create the user-facing entry point for making a new post.

1.  **Enable Modal Control in `Forum.tsx`:**
    - **File:** `frontend/src/pages/Forum.tsx`
    - **Action:** Add state to manage the modal's visibility.
    - **Code:** `const [isModalOpen, setIsModalOpen] = useState(false);`

2.  **Modify "New Topic" Button in `Forum.tsx`:**
    - **File:** `frontend/src/pages/Forum.tsx`
    - **Action:** Convert the existing `<Link>` element to a `<button>` that opens the modal.
    - **Before:** `<Link to="/new-topic" ...>`
    - **After:** `<button onClick={() => setIsModalOpen(true)} ...>`

3.  **Create `CreatePostModal.tsx` Component:**
    - **File:** `frontend/src/components/forum/CreatePostModal.tsx` (new file)
    - **Action:** Build a self-contained modal component.
    - **Details:**
      - Render a full-screen, semi-transparent overlay (`position: fixed`).
      - Center a form element within the overlay.
      - **Form Fields:**
        - Title: `<input type="text" name="title" required />`
        - Topic: `<select name="topic" required><option>Math</option><option>Programming</option><option>Databases</option></select>`
        - Content: `<textarea name="content" required />`
        - Anonymous: `<input type="checkbox" name="isAnonymous" />`
      - **Actions:**
        - "Cancel" button: Calls `props.onClose()`.
        - "Submit Post" button: Type `submit`, initially disabled. Enabled via form validation.

4.  **Integrate Modal into `Forum.tsx`:**
    - **File:** `frontend/src/pages/Forum.tsx`
    - **Action:** Conditionally render the new modal component.
    - **Code:** `{isModalOpen && <CreatePostModal onClose={() => setIsModalOpen(false)} />}`

#### **Phase 2: Backend - API Foundation**

**Goal:** Establish the necessary database structure and API endpoints.

1.  **Define Schemas:**
    - **File 1:** `backend/src/schemas/forumPost.schema.ts` (new file)
      - **Schema:** `ForumPostSchema` with fields: `title`, `content`, `topic`, `authorId` (ObjectId, no ref), `authorRole` (String enum), `isAnonymous` (Boolean), `upvotes` (Number), `replies` (Array of ObjectId with `ref: 'ForumReply'`).
    - **File 2:** `backend/src/schemas/forumReply.schema.ts` (new file)
      - **Schema:** `ForumReplySchema` with fields: `postId` (ObjectId, `ref: 'ForumPost'`), `content`, `authorId`, `authorRole`, `isAnonymous`, `upvotes`.

2.  **Build Forum Module:**
    - **Directory:** `backend/src/modules/forum/` (new directory)
    - **Files:** Create `forum.controller.ts`, `forum.service.ts`, `forum.repo.ts`, and `index.ts` (for routes).

3.  **Implement Service Layer (`forum.service.ts`):**
    - **`createThread(user, data)`:**
      - Accepts the authenticated `user` object from the JWT and `data` from the request body.
      - Uses `user.role` to determine the model (`StudentModel` or `TutorModel`).
      - Calls `findByUserId(user.id)` on that model to get the user's profile document.
      - Creates and saves a new `ForumPost` document, using the `_id` of the profile document as `authorId`.
    - **`getThreads()`:**
      - Fetches all `ForumPost` documents.
      - Performs the efficient manual population: groups `authorId`s by `authorRole`, runs two parallel queries (`StudentModel.find(...)` and `TutorModel.find(...)`), maps the results to a lookup object, and attaches the author profile to each post.
    - **`getThreadById(threadId)`:**
      - Same as `getThreads`, but for a single thread and all its replies, populating the author for the main post and each reply.

4.  **Define Routes and Controller:**
    - **File:** `backend/src/modules/forum/index.ts`
    - **Action:** Define the routes and link them to controller methods.
    - **Endpoints:**
      - `POST /threads`: Calls `forumController.createThread`.
      - `GET /threads`: Calls `forumController.getThreads`.
      - `GET /threads/:threadId`: Calls `forumController.getThreadById`.
    - **File:** `backend/src/routes/index.ts`
    - **Action:** Register the new forum router: `r.use('/forum', forumRoutes);`

#### **Phase 3: Frontend - API Integration**

**Goal:** Connect the frontend UI to the backend API.

1.  **Create `forumApi.ts`:**
    - **File:** `frontend/src/services/forumApi.ts` (new file)
    - **Action:** Create functions to interact with the backend.
    - **Functions:** `createForumPost(postData, token)`, `getForumThreads()`, `getForumThreadById(threadId)`.

2.  **Connect `CreatePostModal.tsx`:**
    - **Action:** Implement the `handleSubmit` function.
    - **Logic:**
      1.  Prevent default form submission.
      2.  Get auth token from `useAuthStore`.
      3.  Call `createForumPost()` with form data and token.
      4.  On success: call `props.onClose()` and trigger a refresh on the main forum page.
      5.  On failure: display an error message within the modal.

3.  **Display Real Data in `Forum.tsx`:**
    - **Action:** Replace the hardcoded `topics` state with a `useEffect` hook.
    - **Logic:** On component mount, call `getForumThreads()` and store the result in a `threads` state variable. Render this state.

#### **Phase 4: Replies and Thread Viewing**

**Goal:** Build the core discussion functionality.

1.  **Implement Replies Endpoint:**
    - **File:** `backend/src/modules/forum/index.ts` & `forum.controller.ts`
    - **Endpoint:** `POST /threads/:threadId/replies`
    - **File:** `backend/src/modules/forum/forum.service.ts`
    - **Function:** `createReply(user, threadId, data)`: Creates a `ForumReply` and pushes its ID to the parent `ForumPost`'s `replies` array.

2.  **Build `ForumTopic.tsx` Page:**
    - **File:** `frontend/src/pages/ForumTopic.tsx`
    - **Action:** Fetch and display a single thread and its replies.
    - **Logic:**
      1.  Get `threadId` from URL params.
      2.  Call `getForumThreadById(threadId)` in a `useEffect`.
      3.  Render the main post's content.
      4.  Map over the `replies` array and render each one.
      5.  Include a "Create Reply" form at the bottom that calls the new replies endpoint.

#### **Phase 5: Real-Time with WebSockets**

**Goal:** Make the forum feel live and interactive.

1.  **Backend Emitters:**
    - **File:** `backend/src/modules/forum/forum.service.ts`
    - **Action:** After successfully saving data, emit socket events.
    - **`createThread` success:** `io.emit('new_post', newPostWithAuthor)`
    - **`createReply` success:** `io.to(threadId).emit('new_reply', newReplyWithAuthor)`

2.  **Frontend Listeners:**
    - **File:** `frontend/src/hooks/useForumSocket.ts` (new file)
    - **Action:** Create a custom hook to manage socket connections and event listeners.
    - **Logic:**
      - Connect to the socket server.
      - Listen for `new_post` and update the main thread list.
      - Listen for `new_reply` and append the reply to the current thread view.
      - Handle cleanup and disconnection on component unmount.

#### **Phase 6: Performance Caching with Redis**

**Goal:** Optimize the backend for speed and scalability.

1.  **Implement Caching Strategy:**
    - **File:** `backend/src/modules/forum/forum.service.ts`
    - **Action:** Wrap data-fetching functions with caching logic.
    - **`getThreadById` Logic:**
      1.  Define cache key: `const key = `thread:${threadId}`;`
      2.  `const cached = await redis.get(key);`
      3.  If `cached`, `return JSON.parse(cached);`
      4.  If not cached, fetch from DB.
      5.  `await redis.set(key, JSON.stringify(dbData), 'EX', 3600);`
      6.  Return `dbData`.

2.  **Implement Cache Invalidation:**
    - **File:** `backend/src/modules/forum/forum.service.ts`
    - **Action:** Delete cache keys when data changes.
    - **`createReply` Logic:** After saving the new reply to the DB, add: `await redis.del(`thread:${threadId}`);`
    - This logic must be applied to any "write" operation (edit, delete, upvote, etc.).

### Future Features Plan

### Forgot Password Functionality

**Phase 1: Backend Implementation**

1.  **Schema Modification:**
    - **File:** `backend/src/schemas/user.schema.ts`
    - **Action:** Add fields to the `UserSchema` to store a password reset token and its expiry.
    - **Fields:** `resetPasswordToken: String`, `resetPasswordExpires: Date`

2.  **Service Layer (`user.service.ts`):**
    - **`forgotPassword(email)`:**
      - Find the user by email.
      - If user exists, generate a unique token using `crypto.randomBytes`.
      - Set `resetPasswordToken` and `resetPasswordExpires` (e.g., 1 hour from now).
      - Save the updated user document.
      - (Stretch Goal) Send an email to the user with a link containing the token (e.g., `http://localhost:5173/reset-password/TOKEN_HERE`). For now, we will log the token to the console.
    - **`resetPassword(token, newPassword)`:**
      - Find the user by their reset token and check if it has expired.
      - If user is found, hash the `newPassword`.
      - Update the user's `passwordHash` and set `resetPasswordToken` and `resetPasswordExpires` to `undefined`.
      - Save the updated user document.

3.  **Controller Layer (`user.controller.ts`):**
    - **`forgotPassword(req, res, next)`:**
      - Call `UserService.forgotPassword(req.body.email)`.
      - Return a success message.
    - **`resetPassword(req, res, next)`:**
      - Call `UserService.resetPassword(req.params.token, req.body.password)`.
      - Return a success message.

4.  **Routes (`/backend/src/modules/users/index.ts`):**
    - `POST /forgot-password`: `UserController.forgotPassword`
    - `POST /reset-password/:token`: `UserController.resetPassword`

**Phase 2: Frontend Implementation**

1.  **Create `ForgotPassword.tsx` Page:**
    - **File:** `frontend/src/pages/Auth/ForgotPassword.tsx` (new file)
    - **UI:** A simple form with an email input and a "Send Reset Link" button.
    - **Logic:** On submit, call a new `forgotPassword` function in `frontend/src/services/authApi.ts` which will hit the `POST /api/users/forgot-password` endpoint.

2.  **Create `ResetPassword.tsx` Page:**
    - **File:** `frontend/src/pages/Auth/ResetPassword.tsx` (new file)
    - **UI:** A form with a password input, a confirm password input, and a "Reset Password" button.
    - **Logic:**
      - Extract the token from the URL parameter.
      - On submit, call a new `resetPassword` function in `frontend/src/services/authApi.ts` which will hit the `POST /api/users/reset-password/:token` endpoint.

3.  **Routing (`frontend/src/App.tsx`):**
    - Add new public routes for `/forgot-password` and `/reset-password/:token`.

### Message Socketing (Real-time Chat)

**Phase 1: Backend Implementation**

1.  **Socket.IO Integration (`backend/src/config/socket.ts`):**
    - Create a new namespace for chat: `const chatNamespace = io.of('/chat');`
    - Listen for connections on the `chatNamespace`.
    - On connection, listen for a `join_room` event, where the room name is the `chatId`.
    - Listen for a `send_message` event, and broadcast the message to all users in that room.

2.  **Service Layer (`backend/src/modules/chat/chat.service.ts`):**
    - Modify the `createMessage` function to emit a `new_message` event to the corresponding chat room using the `chatNamespace`.

**Phase 2: Frontend Implementation**

1.  **Socket.IO Integration (`frontend/src/pages/Messages.tsx`):**
    - Use a custom hook `useChatSocket` to manage the socket connection.
    - **`useChatSocket.ts` (new file):**
      - Connect to the `/chat` namespace.
      - On component mount, emit a `join_room` event with the `chatId`.
      - Listen for `new_message` events and update the local message state.
      - On component unmount, disconnect the socket.

2.  **UI (`frontend/src/pages/Messages.tsx`):**
    - When a new message is received from the socket, append it to the message list in real-time.

### Session 9: Forum Voting Backend & Auth Fixes

- **Goal:** Implement the backend for the forum upvote/downvote feature and fix related persistence bugs.

- **Backend (Voting Feature - Phase 1):**
  - Created a new `UserVote` schema (`userVote.schema.ts`) to track individual user votes on posts and replies, ensuring a user can only vote once per item.
  - Added two new authenticated API endpoints: `POST /api/forum/threads/:threadId/vote` and `POST /api/forum/replies/:replyId/vote`.
  - Implemented a `castVote` method in `ForumService` using a database transaction to atomically handle vote creation, deletion (toggling a vote), and changing a vote (e.g., up to down).
  - Modified `getThreads` and `getThreadById` to be authenticated endpoints. They now query the `UserVote` collection to include the current user's vote status (`userVote: 1, -1, or 0`) on every post and reply returned to the frontend.

- **Bug Fix (Forum Persistence):**
  - Diagnosed and fixed a critical bug where new posts would disappear on refresh for the creator.
  - The root cause was identified in the frontend: the API calls `getForumThreads` and `getForumThreadById` were not sending the user's authentication token, which the newly secured backend routes required.
  - **Solution:** Modified the function signatures in `frontend/src/services/forumApi.ts` to accept the auth token and updated the components (`Forum.tsx` and `ForumTopic.tsx`) to provide it. This resolved all persistence and loading errors.
  - As part of debugging, all Redis caching was removed from the forum's list and detail views to simplify the data flow and guarantee freshness, following patterns used elsewhere in the application.

### Session 10: Forum Voting Frontend

- **Goal:** Implement the frontend for the forum upvote/downvote feature (Phase 2), connecting it to the backend infrastructure.

- **API Service (`forumApi.ts`):**
  - Added new `voteOnPost` and `voteOnReply` functions to send vote data to the corresponding backend endpoints (`POST /api/forum/threads/:threadId/vote` and `POST /api/forum/replies/:replyId/vote`).

- **Component Logic (`Forum.tsx` & `ForumTopic.tsx`):**
  - Replaced the placeholder client-side voting logic in the `handleUpvote` and `handleDownvote` functions.
  - The new implementation performs an "optimistic update" to the UI for immediate user feedback, then calls the new API functions to persist the vote.

- **Real-Time Updates:**
  - Implemented a WebSocket listener for the `vote_updated` event in both `Forum.tsx` and `ForumTopic.tsx`.
  - This listener updates the vote scores on the relevant post or reply in real-time for all connected clients, ensuring a synchronized experience.

- **Overall Result:** The forum voting feature is now complete, fully integrated, and provides a persistent, interactive, and real-time experience for users.

### Upvote/Downvote Feature Implementation Plan

This section details the comprehensive plan for implementing upvote/downvote functionality for forum posts and replies, incorporating all discussions and decisions made.

**Requirements:**

1.  **Upvote/Downvote Buttons:** Functionality for both.
2.  **UI State:** Reflect user's current vote (upvoted, downvoted, or no vote).
3.  **Persistence:** Votes must be saved to the database.
4.  **Single Vote:** A user can only cast one vote (up or down) per post/reply.
5.  **Vote Change:** Users can change their vote (e.g., from upvote to downvote, or remove a vote).

**Schema Analysis and Proposed Changes:**

The existing `upvotes` field in `ForumPostSchema` and `ForumReplySchema` only stores the total net score. To enforce single-vote and vote-change rules, individual user votes must be tracked.

**Decision:** Implement a new `UserVote` collection. This is the most robust and scalable solution for tracking individual user votes, allowing for easy checking of existing votes, updates, and aggregation.

**Detailed Plan:**

**Phase 1: Backend - Schema and API Endpoints**

1.  **Create `UserVote.schema.ts`:**
    - **File:** `backend/src/schemas/userVote.schema.ts` (new file)
    - **Schema Definition:**

      ```typescript
      import { Schema, model, type InferSchemaType } from "mongoose";

      const UserVoteSchema = new Schema(
        {
          userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          targetId: { type: Schema.Types.ObjectId, required: true }, // Refers to ForumPost or ForumReply
          targetType: {
            type: String,
            required: true,
            enum: ["ForumPost", "ForumReply"],
          },
          voteType: { type: Number, required: true, enum: [1, -1] }, // 1 for upvote, -1 for downvote
        },
        { timestamps: true },
      );

      // Ensure a user can only vote once per target item
      UserVoteSchema.index(
        { userId: 1, targetId: 1, targetType: 1 },
        { unique: true },
      );

      export type UserVoteDoc = InferSchemaType<typeof UserVoteSchema>;
      export const UserVoteModel = model<UserVoteDoc>(
        "UserVote",
        UserVoteSchema,
      );
      ```

2.  **Update `ForumPost.schema.ts` and `ForumReply.schema.ts`:**
    - No functional changes to these schemas are required. The `upvotes` field will continue to exist and represent the net score, which will be updated by the `castVote` service method.
    - **Action:** Add a comment to the `upvotes` field in both schemas to clarify its purpose as a derived net score from `UserVote` documents.

3.  **Add new API Endpoints in `backend/src/modules/forum/index.ts`:**
    - **Endpoint 1:** `POST /threads/:threadId/vote`
      - **Purpose:** For authenticated users to cast votes on forum posts.
      - **Protection:** Protected by `requireAuth` middleware.
      - **Controller Method:** `ForumController.voteOnPost`
    - **Endpoint 2:** `POST /replies/:replyId/vote`
      - **Purpose:** For authenticated users to cast votes on forum replies.
      - **Protection:** Protected by `requireAuth` middleware.
      - **Controller Method:** `ForumController.voteOnReply`

4.  **Implement `ForumController` methods (`forum.controller.ts`):**
    - **`voteOnPost(req: AuthedRequest, res: Response)`:**
      - Extract `threadId` from `req.params`.
      - Extract `voteType` (1 or -1) from `req.body`.
      - Get authenticated `user` from `req.user`.
      - Validate `voteType` (must be 1 or -1).
      - Call `ForumService.castVote(user, threadId, "ForumPost", voteType)`.
      - Handle success (200 OK) and error responses (e.g., 400 for invalid input, 404 for not found, 500 for unexpected errors).
    - **`voteOnReply(req: AuthedRequest, res: Response)`:**
      - Extract `replyId` from `req.params`.
      - Extract `voteType` (1 or -1) from `req.body`.
      - Get authenticated `user` from `req.user`.
      - Validate `voteType`.
      - Call `ForumService.castVote(user, replyId, "ForumReply", voteType)`.
      - Handle success and error responses.

5.  **Implement `ForumService.castVote` method (`forum.service.ts`):**
    - **Signature:** `async castVote(user: User, targetId: string, targetType: 'ForumPost' | 'ForumReply', voteType: 1 | -1)`
    - **Imports:** Ensure `mongoose`, `Types`, `UserVoteModel`, `ForumPostModel`, `ForumReplyModel`, `ForumPostDoc`, `ForumReplyDoc` are correctly imported.
    - **Transaction:** Use Mongoose transactions (`session.startSession()`, `session.startTransaction()`, `session.commitTransaction()`, `session.abortTransaction()`) to ensure atomicity of vote operations.
    - **Fetch Target Document:**
      - Determine `Model` (ForumPostModel or ForumReplyModel) based on `targetType`.
      - Fetch `targetDoc` (the post or reply being voted on) using `findById(targetId).session(session)`.
      - If `targetDoc` is not found, throw a 404 `HttpException`.
    - **Find Existing Vote:**
      - Query `UserVoteModel.findOne()` for a vote by `userId`, `targetId`, `targetType` within the current session.
    - **Handle Vote Logic:**
      - **If `existingVote` found:**
        - **If `existingVote.voteType === voteType` (user clicks same vote again):**
          - Delete the `UserVote` document (`UserVoteModel.deleteOne({ _id: existingVote._id }).session(session)`).
          - `voteChange = -voteType;` (e.g., if un-upvoting, subtract 1; if un-downvoting, add 1).
        - **If `existingVote.voteType !== voteType` (user changes vote, e.g., upvote to downvote):**
          - Update `existingVote.voteType = voteType;` and `await existingVote.save({ session })`.
          - `voteChange = voteType * 2;` (e.g., changing from -1 to 1 is a net change of +2; changing from 1 to -1 is a net change of -2).
      - **If no `existingVote` found (new vote):**
        - Create a new `UserVote` document (`UserVoteModel.create([{ ... }], { session })`).
        - `voteChange = voteType;` (e.g., +1 for upvote, -1 for downvote).
    - **Update Net Score:**
      - Atomically update the `upvotes` field in the `ForumPost` or `ForumReply` document using `$inc`:
        `await (Model as mongoose.Model<any>).findByIdAndUpdate(targetId, { $inc: { upvotes: voteChange } }, { new: true, session }).lean();`
      - Store the result in `updatedTargetDoc`.
    - **Cache Invalidation:**
      - Invalidate `FORUM_THREADS_CACHE_KEY`.
      - Invalidate the specific thread cache: `FORUM_THREAD_CACHE_KEY(targetType === "ForumPost" ? targetId : (targetDoc as ForumReplyDoc).postId.toString())`. (Using `targetDoc.postId` for replies to get the parent thread ID).
    - **WebSocket Emission:**
      - Emit a `vote_updated` event to notify clients in real-time about the vote change.
      - Payload: `{ targetId, targetType, newUpvotes: updatedTargetDoc?.upvotes, userId: user.id, userVote: voteType }`.
    - **Return:** The `updatedTargetDoc`.
    - **Error Handling:** Catch errors, abort transaction, end session, and throw appropriate `HttpException`.

**Phase 2: Frontend - UI and API Integration**

1.  **Update `forumApi.ts`:**
    - **`voteOnPost(threadId: string, voteType: 1 | -1, token: string)`:** Sends `POST` request to `/forum/threads/:threadId/vote`.
    - **`voteOnReply(replyId: string, voteType: 1 | -1, token: string)`:** Sends `POST` request to `/forum/replies/:replyId/vote`.

2.  **Update `Forum.tsx` (for posts):**
    - **Modify `handleUpvote` and `handleDownvote`:**
      - Call `forumApi.voteOnPost` with `thread._id` and `voteType`.
      - Handle `try/catch` for API calls.
    - **UI State Management:**
      - The `threads` state will include a `userVote` property (0, 1, -1) for each thread.
      - Update local `threads` state based on the API response or `vote_updated` WebSocket event.
      - Apply CSS classes (`upvoted`, `downvoted`) to buttons based on `thread.userVote`.
    - **WebSocket Listener:**
      - Listen for `socket.on("vote_updated", (data) => { ... })`.
      - Update the `upvotes` and `userVote` for the relevant thread in the `threads` state.

3.  **Update `ForumTopic.tsx` (for replies):**
    - **Modify `handleReplyUpvote` and `handleReplyDownvote`:**
      - Call `forumApi.voteOnReply` with `reply._id` and `voteType`.
      - Handle `try/catch` for API calls.
    - **UI State Management:**
      - The `thread.replies` state will include a `userVote` property for each reply.
      - Update local `thread.replies` state based on the API response or `vote_updated` WebSocket event.
      - Apply CSS classes (`upvoted`, `downvoted`) to buttons based on `reply.userVote`.
    - **WebSocket Listener:**
      - Listen for `socket.on("vote_updated", (data) => { ... })`.
      - Update the `upvotes` and `userVote` for the relevant reply in the `thread.replies` state.

4.  **Initial `userVote` state on load:**
    - **Backend (`ForumService.getThreads()` and `ForumService.getThreadById()`):**
      - When fetching threads/thread, perform an additional lookup in the `UserVote` collection for the currently authenticated user's vote on each post/reply.
      - Include this `userVote` (1, -1, or 0 if no vote) in the returned data for each post/reply. This will require accessing `req.user` in `getThreads` and `getThreadById` (potentially requiring `requireAuth` for these endpoints or a separate authenticated endpoint for fetching user-specific vote data).

This detailed plan covers all aspects of the upvote/downvote feature, from schema design to frontend UI and real-time updates, including vote change logic.

--- 

## Session 11: Project Enhancement Plan 

This new plan outlines the development phases for the next set of tasks on the CampusLearn project.

### Phase 1: Cascade Deletion of Messages

**Goal:** Ensure chat messages are properly deleted when a user relationship or profile is terminated.

**Sub-phases:**
- [ ] **Unsubscribe from Tutor:**
    - [ ] **Backend:** Hook into the existing "unsubscribe" service function. When a student unsubscribes from a tutor, trigger a function to delete all chat messages between that student and tutor.
    - [ ] **Backend:** Implement the `deleteChatHistory(userId1, userId2)` function in the chat service.
- [ ] **Delete User Profile:**
    - [ ] **Backend:** Hook into the existing "delete user" service function. When a user deletes their profile, trigger a function to delete all chat messages where they are either the sender or receiver.

### Phase 2: Ironing out Messages (General Improvements)

**Goal:** Improve the chat UI/UX and implement quality-of-life features.

**Sub-phases:**
- [ ] **Date Separation:**
    - [ ] **Frontend:** Implement logic in the chat component to display a date separator (e.g., "--- September 30, 2025 ---") when the date of a message is different from the previous one.
- [ ] **System Messages:**
    - [ ] **Frontend:** Modify the chat component to render the "Conversation started" message as a centered, non-user-affiliated system message, distinct from user messages.
- [ ] **Rate Limiting:**
    - [ ] **Backend:** Implement a server-side rate limiter for the `send_message` socket event to allow a maximum of 5 messages per 30 seconds per user.
    - [ ] **Frontend:** Provide UI feedback (e.g., a temporary message or disabled input) when a user is rate-limited.
- [ ] **"Three Dots" Menu Functionality:**
    - [ ] **Frontend:** Implement the UI for the "three dots" menu in the chat header.
    - [ ] **View Profile Option:**
        - [ ] **Frontend:** Add a "View Profile" option to the menu.
        - [ ] **Frontend:** On click, navigate to a read-only view of the other user's profile.
    - [ ] **Close Chat Option:**
        - [ ] **Frontend:** Add a "Close Chat" option that triggers a confirmation modal (reusing the existing modal component style).
        - [ ] **Backend:** Create a new secure endpoint (`DELETE /api/chat/:chatId`) to delete the entire chat history for the given chat ID.
        - [ ] **Frontend:** On confirmation, call the new backend endpoint to delete the chat history.

--- 

### Phase 3: Messaging Correct Online Status

**Goal:** Fix the bug causing incorrect online status to be displayed.

**Sub-phases:**
- [ ] **Analysis:**
    - [ ] **Backend:** Investigate the `socket.io` connection logic, user authentication, and how user IDs are mapped to socket IDs.
    - [ ] **Backend:** Review the `useGlobalSocket` and related authentication middleware to understand how JWTs and socket connections are currently handled, especially when multiple users are logged in from the same client machine.
- [ ] **Fix Implementation:**
    - [ ] **Backend:** Refactor the socket connection logic to ensure a unique and correct mapping between a user ID and their specific socket instance. This will likely involve creating a server-side mapping (e.g., an object or Map) like `{ userId: socketId }`.
    - [ ] **Backend:** Ensure that when a user connects or disconnects, the `online_status` event is emitted with the correct `userId` and `status` to all relevant clients.
- [ ] **Verification:**
    - [ ] **Testing:** Open two different browsers (or browser profiles) and log in with two different user accounts. Verify that the online status for each user is displayed correctly to the other user and does not get overwritten.

--- 

### Phase 4: Docker Deployment Enhancement

**Goal:** Modernize the Docker setup for a production-like environment.

**Sub-phases:**
- [ ] **Backend Dockerfile:**
    - [ ] **Analyze:** Review the existing `Dockerfile`.
    - [ ] **Implement:** Convert it to a multi-stage build. The first stage will install dependencies and build the TypeScript code. The final stage will copy only the compiled JavaScript (`dist` folder), `node_modules`, and other necessary assets into a smaller, production-ready Node.js image.
- [ ] **Frontend Dockerfile:**
    - [ ] **Create:** Create a new `Dockerfile` in the `frontend` directory.
    - [ ] **Implement:** Use a multi-stage build. The first stage will use a Node.js image to install dependencies (`npm install`) and build the React application (`npm run build`). The final stage will copy the built static files (from the `dist` directory) into a lightweight web server image like Nginx.
- [ ] **Docker Compose Update:**
    - [ ] **Analyze:** Review the existing `docker-compose.yml`.
    - [ ] **Update:** Modify the `api` service to use the new multi-stage backend `Dockerfile`.
    - [ ] **Add Frontend Service:** Add a new service for the frontend (e.g., `frontend`) that builds using the new frontend `Dockerfile` and is served by Nginx.
    - [ ] **Networking:** Ensure the frontend and backend services can communicate with each other within the Docker network.
- [ ] **Documentation:**
    - [ ] **Update README:** Add a clear and concise section to the main `README.md` file explaining how to build and run the entire application stack with a single command: `docker-compose up --build`.
### Messages Optimization

**Problem:** The current implementation for fetching chat messages is inefficient. When a conversation is loaded, the backend retrieves all messages and their associated file uploads (if any) from MongoDB, decompresses the files, and sends them in the initial payload. This leads to slow response times and high server memory usage, especially for chats containing numerous or large files.

**Solution:** A multi-phased approach to decouple message metadata from file content, ensuring fast initial loads while providing on-demand access to file data.

**Phase 1: Backend - Decouple Content from Metadata**

*   **Goal:** Modify the backend to only fetch lightweight message metadata on initial load, deferring the retrieval of heavy file content.
*   **Actions:**
    1.  **Optimize Data Retrieval:** In `chat.service.ts`, update the primary data retrieval functions (`getConversationThread`, `list`, `conversation`) to exclude the binary `upload` field from the initial MongoDB query using a `.select('-upload')` projection.
    2.  **Create Dedicated File Endpoint:** Implement a new, secure API endpoint, `GET /api/chat/messages/:messageId/download`.
*   **Mechanism:**
    *   The new endpoint will be responsible for fetching a *single* message by its ID.
    *   It will retrieve *only* the `upload` buffer, decompress it, and stream the file directly to the client with the correct `Content-Type` and `Content-Disposition` headers.
*   **Outcome:** Initial conversation loads become extremely fast as they no longer include heavy file data.

**Phase 2: Backend - Implement Smart Caching with Redis**

*   **Goal:** Leverage Redis to cache the now-lightweight message metadata for near-instantaneous conversation loading.
*   **Actions:**
    1.  **Implement Cache-Aside Pattern:** In the message retrieval functions, check Redis for cached data before querying the database.
    2.  **Manage Cache Keys:** Use a consistent keying strategy, such as `chat:<chatId>:messages:latest`.
*   **Mechanism:**
    *   **Cache Miss:** If a conversation is not in the cache, fetch the metadata from MongoDB (as per Phase 1), then store the result in Redis with a suitable Time-To-Live (TTL), for example, 1 hour.
    *   **Cache Hit:** If the conversation is found in Redis, return the cached data immediately, bypassing the database.
    *   **Cache Invalidation:** When a new message is sent within a chat, `DELETE` the corresponding cache key (`chat:<chatId>:messages:latest`) to ensure data freshness on the next read.
*   **Outcome:** Subsequent loads of recent conversations are served directly from memory, dramatically reducing latency.

**Phase 3: Frontend - Adapt to New Data Flow**

*   **Goal:** Update the frontend UI to align with the new on-demand data loading architecture.
*   **Actions:**
    1.  **Modify File Rendering:** In the main chat component, change how file attachments are displayed.
*   **Mechanism:**
    *   Instead of rendering a file from an inline base64 string, the UI will now render a standard HTML anchor (`<a>`) tag for file attachments.
    *   The `href` attribute of this link will point to the new dedicated download endpoint (e.g., `/api/chat/messages/${message._id}/download`).
*   **Outcome:** The browser can natively and efficiently handle file downloads or inline viewing (for types like images and PDFs), and the frontend application's memory footprint is reduced.
