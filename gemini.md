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

### Session 4: File Upload Feature Implementation and Debugging

- **Goal:** Implement file upload functionality for tutors, allowing them to upload learning materials.
- **Backend Implementation:**
  - **Schema (`backend/src/schemas/tutorUpload.schema.ts` renamed to `file.schema.ts` conceptually):** Defined a `FileSchema` to store file metadata (tutorId, subject, subtopic, title, description, contentType) and the binary `content` of the file. The `description` field was made `required` to align with frontend validation. The `content` field was set to `select: false` for performance optimization.
  - **Repository (`backend/src/modules/files/file.repo.ts`):** Created a repository for CRUD operations on the `File` model.
  - **Service (`backend/src/modules/files/file.service.ts`):** Implemented the business logic for file creation, including determining the `contentType` using `mime-types` based on the file's original name. Also included methods for listing, retrieving (with/without binary content), updating, and deleting files.
  - **Controller (`backend/src/modules/files/file.controller.ts`):** Created a controller to handle API requests for file operations. Integrated `multer` for handling `multipart/form-data` file uploads. Added endpoints for creating, listing, retrieving (meta and binary), updating, and deleting files.
  - **Routes (`backend/src/modules/files/index.ts`):** Configured routes to expose the file API endpoints.
- **Frontend Implementation (`frontend/src/pages/Upload.tsx`):**
  - Implemented the UI for file uploads, including drag-and-drop functionality, file selection, and input fields for title, subject, subtopic, and description.
  - Added client-side validation to ensure all fields are filled before submission. The title is automatically populated from the filename (without extension).
  - Integrated `useAuthStore` to get the `tutorId` for file uploads.
  - Added `isSubmitting` state to provide visual feedback during upload and prevent multiple submissions.
  - Implemented basic success and error message display after API calls.
- **Challenges and Lessons Learned:**
  - **Frontend White Screen/Rendering Issues:** Repeatedly encountered a white screen on the frontend after implementing file upload features. This was primarily due to:
    - **Incorrect component integration:** Attempting to render `UploadedFiles` component before it was fully stable or correctly integrated, leading to rendering errors.
    - **Dependency issues/Circular dependencies:** Potential issues with how `useAuthStore` or `api` were being used or imported, causing the application to crash during rendering.
    - **Unstable development practices:** Moving too quickly between features without thorough testing at each step, leading to cascading errors that were difficult to debug.
  - **Backend Submission Failures:** Initial attempts to submit files to the database resulted in the frontend showing "Submitting..." but no data appearing in MongoDB Atlas. This was due to:
    - **Syntax errors in backend service:** A missing parenthesis in `file.service.ts` caused the backend TypeScript compilation to fail, preventing the server from starting correctly and thus blocking any API calls.
    - **Lack of immediate feedback:** The frontend was not adequately configured to display specific backend errors, making debugging difficult.
  - **Lesson Learned:** For complex feature implementations, especially those involving both frontend and backend changes, a more granular, step-by-step approach with frequent testing is crucial. Prioritize application stability over rapid feature development. Ensure robust error handling and clear user feedback on both ends of the application. Thoroughly test each new piece of functionality in isolation before integrating it into the larger system. Always verify backend compilation and server startup after any backend code changes.
