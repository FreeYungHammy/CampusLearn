
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

  it('should allow a user to create a post, vote on it, add a reply, and see the results', () => {
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

    // --- 3. Test Downvoting the Post First ---
    // Find the post card containing our title
    cy.get('[data-cy="post-title"]').contains(postTitle).parents('.topic-card').within(() => {
      // Get initial vote count (should be 0 for a new post)
      cy.get('[data-cy="vote-count"]').should('contain', '0');
      
      // Click downvote button first
      cy.get('[data-cy="downvote-btn"]').click();
      
      // Wait a moment for the vote to be processed
      cy.wait(500);
      
      // Verify vote count decreased to -1
      cy.get('[data-cy="vote-count"]').should('contain', '-1');
    });

    // --- 4. Test Upvoting the Post (Change Vote) ---
    cy.get('[data-cy="post-title"]').contains(postTitle).parents('.topic-card').within(() => {
      // Click upvote button (this should change the vote from -1 to +1)
      cy.get('[data-cy="upvote-btn"]').click();
      
      // Wait a moment for the vote to be processed
      cy.wait(500);
      
      // Verify vote count increased (from -1 to +1 is a change of +2)
      cy.get('[data-cy="vote-count"]').should('contain', '1');
    });

    // --- 5. Navigate to Post and Add a Reply ---
    cy.get('[data-cy="post-title"]').contains(postTitle).click();
    
    // Assert we are on the correct page
    cy.url().should('include', '/forum/');
    cy.get('h1').should('contain', postTitle);
    
    cy.get('[data-cy="reply-textarea"]').type(replyContent);
    cy.get('[data-cy="post-reply-btn"]').click();

    // --- 6. Verify Reply Appears ---
    cy.get('.reply-card').should('contain', replyContent);
    
    // --- 7. Test Downvoting the Reply ---
    cy.get('.reply-card').contains(replyContent).parents('.reply-card').within(() => {
      // Get initial vote count (should be 0 for a new reply)
      cy.get('[data-cy="reply-vote-count"]').should('contain', '0');
      
      // Click downvote button
      cy.get('[data-cy="reply-downvote-btn"]').click();
      
      // Wait a moment for the vote to be processed
      cy.wait(500);
      
      // Verify vote count decreased to -1
      cy.get('[data-cy="reply-vote-count"]').should('contain', '-1');
    });

    // --- 8. Test Upvoting the Reply (Change Vote) ---
    cy.get('.reply-card').contains(replyContent).parents('.reply-card').within(() => {
      // Click upvote button (change from -1 to +1)
      cy.get('[data-cy="reply-upvote-btn"]').click();
      
      // Wait a moment for the vote to be processed
      cy.wait(500);
      
      // Verify vote count increased to +1
      cy.get('[data-cy="reply-vote-count"]').should('contain', '1');
    });
    
    // --- 9. Error Reporting ---
    // Cypress automatically captures a video of the entire run and takes a screenshot
    // if any step above fails. This provides invaluable visual evidence for debugging,
    // including network errors, UI glitches, or failed assertions. The command log
    // will show the exact step of failure.
  });
});
