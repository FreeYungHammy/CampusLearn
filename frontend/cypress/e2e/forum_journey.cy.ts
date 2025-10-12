
describe('Full Forum User Journey', () => {
  beforeEach(() => {
    // Use custom command for faster and more reliable login
    cy.login('test.student@student.belgiumcampus.ac.za', 'password123');
    
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
    cy.get('[data-cy="new-topic-btn"]').click();
    
    // Assert modal is visible
    cy.get('[data-cy="create-post-modal"]').should('be.visible');
    
    cy.get('[data-cy="post-title-input"]').type(postTitle);
    cy.get('[data-cy="post-topic-select"]').select('Programming');
    cy.get('[data-cy="post-content-textarea"]').type(postContent);
    
    cy.get('[data-cy="submit-post-btn"]').click();

    // --- 2. Verify Post Appears in the List ---
    // The UI should update in real-time via WebSockets, but we can also assert it's in the list
    cy.get('[data-cy="post-title"]').contains(postTitle).should('be.visible');

    // --- 3. Navigate to Post and Add a Reply ---
    cy.get('[data-cy="post-title"]').contains(postTitle).click();
    
    // Assert we are on the correct page
    cy.url().should('include', '/forum/');
    cy.get('h1').should('contain', postTitle);
    
    cy.get('[data-cy="reply-textarea"]').type(replyContent);
    cy.get('[data-cy="post-reply-btn"]').click();

    // --- 4. Verify Reply Appears ---
    cy.get('.reply-card').should('contain', replyContent);
    
    // --- 5. Error Reporting ---
    // Cypress automatically captures a video of the entire run and takes a screenshot
    // if any step above fails. This provides invaluable visual evidence for debugging,
    // including network errors, UI glitches, or failed assertions. The command log
    // will show the exact step of failure.
  });
});
