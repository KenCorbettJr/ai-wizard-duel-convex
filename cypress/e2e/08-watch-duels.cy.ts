describe("Watch Duels Page", () => {
  beforeEach(() => {
    // Ensure Convex emulator is ready
    cy.waitForConvex();
  });

  it("should display the watch duels page", () => {
    cy.visit("/duels/watch");

    // Check main heading and description
    cy.contains("Watch Duels").should("be.visible");
    cy.contains(
      "Witness epic magical battles from wizards across the platform"
    ).should("be.visible");
  });

  it("should display recent duels section", () => {
    cy.visit("/duels/watch");

    // Check for recent duels section
    cy.contains("Recent Duels").should("be.visible");

    // Should show either duels or empty state
    cy.get("body").then(($body) => {
      if ($body.text().includes("No duels found")) {
        cy.contains("No duels found").should("be.visible");
        cy.contains("There are no duels to watch yet").should("be.visible");
      } else {
        // If there are duels, the loading state should eventually resolve
        cy.get('[data-testid="duel-list-item"]', { timeout: 10000 }).should(
          "exist"
        );
      }
    });
  });

  it("should be accessible from homepage", () => {
    cy.visit("/");

    // Click the Watch Duels button
    cy.get('a[href="/duels/watch"]').should("be.visible").click();
    cy.url().should("include", "/duels/watch");

    // Verify we're on the right page
    cy.contains("Watch Duels").should("be.visible");
  });

  it("should be accessible from navbar", () => {
    cy.visit("/");

    // Check navbar link (for signed out users)
    cy.get('nav a[href="/duels/watch"]').should("be.visible").click();
    cy.url().should("include", "/duels/watch");
  });

  it("should handle loading states gracefully", () => {
    cy.visit("/duels/watch");

    // Should show loading spinner initially or content
    cy.get("body").should("contain.text", "Watch Duels");

    // Wait for content to load
    cy.get("body", { timeout: 10000 }).should(
      "not.contain",
      "Loading duels..."
    );
  });

  it("should be responsive on mobile", () => {
    cy.viewport("iphone-x");
    cy.visit("/duels/watch");

    // Check that main elements are visible on mobile
    cy.contains("Watch Duels").should("be.visible");
    cy.contains("Recent Duels").should("be.visible");
  });
});
