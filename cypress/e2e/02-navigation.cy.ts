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
    cy.get('[data-test-id="theme-toggle"]').should("exist");

    cy.log(
      "Current theme:",
      Cypress.$("html").hasClass("dark") ? "dark" : "light",
    );
    // see if the html has a light or dark class right now
    if (Cypress.$("html").hasClass("dark")) {
      cy.get('[data-test-id="theme-toggle"]').click();
      cy.get("html").should("have.class", "light");
    } else {
      cy.get('[data-test-id="theme-toggle"]').click();
      cy.get("html").should("have.class", "dark");
    }
  });
});
