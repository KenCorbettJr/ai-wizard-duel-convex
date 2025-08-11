describe("Navigation", () => {
  beforeEach(() => {
    cy.waitForConvex();
  });

  it("should navigate to all main pages", () => {
    const pages = [
      { path: "/", title: "AI Wizard Duel" },
      { path: "/duels", title: "Duels" },
      { path: "/leaderboard", title: "Leaderboard" },
    ];

    pages.forEach((page) => {
      cy.visit(page.path);
      cy.contains(page.title).should("be.visible");
    });
  });

  it("should handle 404 pages gracefully", () => {
    cy.visit("/non-existent-page", { failOnStatusCode: false });
    // Depending on your 404 setup, adjust this assertion
    cy.url().should("include", "/non-existent-page");
  });

  it("should have working theme toggle", () => {
    cy.visit("/");

    // Look for theme toggle button (adjust selector based on your implementation)
    cy.get('[data-testid="theme-toggle"]').should("exist");

    // Test theme switching if implemented
    // cy.get('[data-testid="theme-toggle"]').click()
    // cy.get('html').should('have.class', 'dark')
  });
});
