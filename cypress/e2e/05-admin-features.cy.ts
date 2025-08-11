describe("Admin Features", () => {
  beforeEach(() => {
    cy.waitForConvex();
    // In a real scenario, you'd sign in as an admin user
    // cy.signInAdminUser()
  });

  it("should access admin dashboard", () => {
    cy.visit("/admin");

    // Should display admin dashboard
    cy.contains("Admin").should("be.visible");
  });

  it("should display duel management tools", () => {
    cy.visit("/admin");

    // Should show admin controls
    cy.contains("Manage Duels").should("be.visible");
    cy.contains("User Management").should("be.visible");
  });

  it("should allow moderating duels", () => {
    cy.visit("/admin");

    // Look for duel moderation tools
    cy.get('[data-testid="duel-admin-card"]')
      .first()
      .within(() => {
        cy.get("button").contains("View").click();
      });

    // Should navigate to duel admin view
    cy.url().should("include", "/admin/duels/");

    // Should display admin controls
    cy.contains("Admin Controls").should("be.visible");
  });

  it("should handle bulk operations", () => {
    cy.visit("/admin");

    // Test bulk actions if implemented
    cy.get('[data-testid="select-all"]').check();
    cy.get("button").contains("Bulk Action").click();

    // Verify bulk action menu appears
    cy.contains("Delete Selected").should("be.visible");
  });

  it("should display system statistics", () => {
    cy.visit("/admin");

    // Should show system stats
    cy.contains("Total Users").should("be.visible");
    cy.contains("Active Duels").should("be.visible");
    cy.contains("System Health").should("be.visible");
  });
});
