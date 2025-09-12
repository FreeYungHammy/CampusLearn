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

The current development strategy is to prioritize the implementation of core application features, with performance optimization via a Redis caching layer planned for a later stage.

To ensure a smooth future integration, all new backend and frontend logic should be written with this "optimize later" approach in mind. The existing application architecture is well-suited for this. The following principles should be maintained:

- **Backend:** Continue to separate business logic into a distinct service layer. This allows caching to be cleanly added to service methods in the future without requiring significant refactoring of controllers or repositories.
- **Frontend:** Continue to develop components that fetch all necessary data for a view in a single, centralized API call (e.g., on component load). This pattern works efficiently with a future backend caching layer.
- **API Design:** Continue to design granular API endpoints that separate lightweight metadata from heavy binary content, allowing for fast retrieval of information needed to render a UI.

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

- **Goal:** Replace the non-functional "Download" button with a "View" button that intelligently handles file rendering. For browser-viewable files (PDFs, images, text), it will display them in a modal. For other files (spreadsheets, documents), it will trigger a proper download with the correct file extension.

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
        - Inside this function, check if the file's `contentType` is one of the viewable types.
        - **If Viewable:** Set the `selectedFile` in state and set `isModalOpen` to `true`.
        - **If Not Viewable:** Open the file's binary URL (`/api/files/:id/binary`) in a new tab, which will trigger the corrected download behavior from the backend.
    4.  **Modal Component:**
        - Implement a modal component that is displayed when `isModalOpen` is true.
        - The modal will contain an `iframe` whose `src` is set to the binary URL of the `selectedFile`.
        - Include a "Close" button on the modal to set `isModalOpen` to `false`.
        - Add a title to the modal displaying the file's name.

---

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
      - **Schema:** `ForumPostSchema` with fields: `title`, `content`, `topic`, `authorId` (ObjectId, no ref), `authorRole` (String enum), `isAnonymous` (Boolean), `upvotes` (Number), `replies` (Array of ObjectId with `ref: 'ForumReply'`)
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
