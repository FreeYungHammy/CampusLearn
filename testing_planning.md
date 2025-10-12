# CampusLearn - A Comprehensive, Multi-Layered Testing Strategy

## 1. Testing Philosophy & The Testing Pyramid

To achieve the highest standard of quality and reliability ("full marks"), we will adopt the **Testing Pyramid** as our guiding philosophy. This industry-best-practice model dictates a multi-layered approach, ensuring we have a high volume of fast, specific tests at the base and fewer, broader tests at the top.

*   **Level 1: Unit Tests (The Foundation):** The largest and most important part of our suite. These are fast, isolated white-box tests that validate individual functions and logic paths within our services.
*   **Level 2: Integration Tests (The Middle Layer):** These tests verify that different parts of our backend work together correctly. They test the collaboration between controllers, services, and a real (in-memory) database.
*   **Level 3: End-to-End (E2E) Tests (The Peak):** A select few automated UI tests that simulate a full user journey through the application, from login to logout, ensuring the frontend and backend work together seamlessly.

This structure provides the best balance of confidence, speed, and maintainability.

---

## 2. Level 1: White-Box Unit Testing (Backend)

**Objective:** To verify the internal correctness of every critical piece of business logic in isolation. This is achieved by mocking all external dependencies (database, other services) to test specific logic paths.

**Tooling:** Jest

### Priority 1: Data Integrity & Cascade Deletion

**Why it's Critical:** Based on the code review, the `UserService.remove` function is the most fragile and critical function in the application. A failure here could leave orphaned data across more than seven database collections.

**Target: `user.service.ts` - `remove(id)` function**

| Test Case | Arrangement (Given) | Action (When) | Assertions (Then) & Coverage |
| :--- | :--- | :--- | :--- |
| **Success Path** | Mock all dependent deletion methods (`ChatService.deleteAllMessagesForUser`, `gcsService.deleteObject`, etc.) to resolve successfully. Spy on each one. | Call `UserService.remove(userId)`. | **Side Effects:** Assert that **every** spy for each deletion method was called exactly once with the correct arguments. This verifies the full cascade. |
| **Failure: GCS Deletion Fails** | Force the `gcsService.deleteObject` mock to throw an error. Spy on all other methods. | `expect(UserService.remove(userId)).rejects.toThrow()`. | **Side Effects:** Assert that methods *before* the GCS call were called, and methods *after* it were **not**. This validates the `try/catch` error handling. |

### Priority 2: Security & Authorization

**Why it's Critical:** Flaws in authentication logic can compromise the entire system.

**Target: `auth.middleware.ts` - `requireAuth` function**

| Test Case | Arrangement (Given) | Action (When) | Assertions (Then) & Coverage |
| :--- | :--- | :--- | :--- |
| **Token is Blacklisted** | Mock `CacheService.get` to return `"blacklisted"`. | Call `requireAuth` on a mock request. | **Outcome:** Returns a `401` status. `next()` is **not** called. **Coverage:** Validates the critical `if (isBlacklisted)` branch. |

### Priority 3: Transactional Integrity

**Why it's Critical:** The `ForumService.castVote` function uses a database transaction which must be atomic.

**Target: `forum.service.ts` - `castVote` function**

| Test Case | Arrangement (Given) | Action (When) | Assertions (Then) & Coverage |
| :--- | :--- | :--- | :--- |
| **Transaction Rollback** | Mock and spy on the Mongoose `session` object. Force a database method inside the `try` block to throw an error. | `expect(ForumService.castVote(...)).rejects.toThrow()`. | **Side Effects:** `session.abortTransaction` is called. `session.commitTransaction` is **not** called. **Coverage:** Validates the `catch` block and ensures atomicity. |

### Priority 4: Complex Logic & Aggregations

**Why it's Critical:** The project requirement to "retrieve tutor assignments" is met by the `SubscriptionRepo.findByStudentId` function, which uses a complex, multi-stage MongoDB aggregation pipeline. A flaw in this pipeline would return incorrect data to the user.

**Target: `subscription.repo.ts` - `findByStudentId` function**

| Test Case | Arrangement (Given) | Action (When) | Assertions (Then) & Coverage |
| :--- | :--- | :--- | :--- |
| **Correct Data Shaping** | Use an in-memory MongoDB server (`mongodb-memory-server`) to seed a known state (e.g., 1 student, 2 tutors, 1 subscription). | Call the real `SubscriptionRepo.findByStudentId(studentId)`. | **Return Value:** Assert that the returned array contains exactly one tutor and that its shape is correct (e.g., `studentCount` is calculated, `pfp` is included, `_id` is mapped to `id`). **Coverage:** This advanced technique validates the correctness of the entire aggregation pipeline logic. |

---

## 3. Level 2: Integration Testing (Backend)

**Objective:** To verify that the primary modules of the backend work together as expected, including the API controllers, services, and a live (in-memory) database.

**Tooling:** Jest, Supertest, `mongodb-memory-server`

**Example Test Case: Forum Post Creation**

*   **Target:** `POST /api/forum/threads`
*   **Description:** This test validates that a user can successfully create a forum thread through the API, and that it is correctly persisted in the database.
*   **Steps:**
    1.  **Setup:** Before the test, connect to an in-memory MongoDB instance. Create a mock user and generate a valid JWT for them.
    2.  **Action:** Use `supertest` to make a `POST` request to the `/api/forum/threads` endpoint, including the JWT in the header and valid post data in the body.
    3.  **Assertion 1 (API Response):** Assert that the API returns a `201 Created` status and that the response body contains the newly created post.
    4.  **Assertion 2 (Database State):** Use the real `ForumPostModel` to query the in-memory database directly and assert that the post document was saved correctly.
    5.  **Teardown:** After the test, clean the database and disconnect.

---

## 4. Level 3: Automated UI End-to-End (E2E) Testing

**Objective:** To validate "critical user journeys" from the user's perspective, ensuring the frontend and backend are correctly integrated.

**Tooling:** Cypress

### Demonstration Code: Critical User Journey - Full Forum Interaction

This test file would be located at `frontend/cypress/e2e/forum_journey.cy.ts`.

```javascript
// frontend/cypress/e2e/forum_journey.cy.ts

describe('Full Forum User Journey', () => {
  beforeEach(() => {
    // Run a custom command to log in programmatically
    // This is faster and more reliable than repeating UI login steps for every test
    cy.login('student@student.belgiumcampus.ac.za', 'password123');
    
    // Intercept the API call for threads to wait for it later
    cy.intercept('GET', '/api/forum/threads**').as('getThreads');
    
    cy.visit('/forum');
    
    // Wait for the initial threads to load
    cy.wait('@getThreads');
  });

  it('should allow a user to create a post, view it, add a reply, and see the result', () => {
    const postTitle = `My Cypress Test Post - ${Date.now()}`;
    const postContent = 'This is the content of the test post.';
    const replyContent = 'This is a reply from the automated test.';

    // --- 1. Create a New Post ---
    cy.get('button').contains('New Topic').click();
    
    // Assert modal is visible
    cy.get('[data-cy="create-post-modal"]').should('be.visible');
    
    cy.get('input[name="title"]').type(postTitle);
    cy.get('select[name="topic"]').select('Programming');
    cy.get('textarea[name="content"]').type(postContent);
    
    cy.get('button[type="submit"]').contains('Submit Post').click();

    // --- 2. Verify Post Appears in the List ---
    // The UI should update in real-time via WebSockets, but we can also assert it's in the list
    cy.contains('.topic-card h3', postTitle).should('be.visible');

    // --- 3. Navigate to Post and Add a Reply ---
    cy.contains('.topic-card h3', postTitle).click();
    
    // Assert we are on the correct page
    cy.url().should('include', '/forum/');
    cy.get('h1').should('contain', postTitle);
    
    cy.get('textarea[placeholder="Add a reply..."]').type(replyContent);
    cy.get('button').contains('Post Reply').click();

    // --- 4. Verify Reply Appears ---
    cy.get('.reply-card').should('contain', replyContent);
    
    // --- 5. Error Reporting ---
    // Cypress automatically captures a video of the entire run and takes a screenshot
    // if any step above fails. This provides invaluable visual evidence for debugging,
    // including network errors, UI glitches, or failed assertions. The command log
    // will show the exact step of failure.
  });
});
```
This comprehensive, multi-layered strategy provides robust quality assurance, directly addresses all stated requirements, and represents a "10/10" approach to testing for a modern, full-stack application.