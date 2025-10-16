/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to log in programmatically via API
       * @param email - User email
       * @param password - User password
       * @example cy.login('test@student.belgiumcampus.ac.za', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session(
    [email, password],
    () => {
      // Make API request to login endpoint
      cy.request({
        method: 'POST',
        url: '/api/users/login',
        body: {
          email,
          password,
        },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('token');
        
        // Store auth data in Zustand's persisted storage format
        const authStorage = {
          state: {
            token: response.body.token,
            user: response.body.user || null,
            pfpTimestamps: {},
          },
          version: 0,
        };
        
        window.localStorage.setItem('auth-storage', JSON.stringify(authStorage));
      });
    },
    {
      validate() {
        // Verify session is still valid by checking Zustand storage
        cy.window().then((win) => {
          const authStorage = win.localStorage.getItem('auth-storage');
          expect(authStorage).to.exist;
          const parsed = JSON.parse(authStorage as string);
          expect(parsed.state.token).to.exist;
        });
      },
    }
  );
});

export {};

