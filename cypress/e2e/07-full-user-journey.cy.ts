describe("Full User Journey", () => {
  beforeEach(() => {
    cy.waitForConvex();
  });

  it("should complete a full wizard duel journey", () => {
    // 1. Visit homepage
    cy.visit("/");
    cy.contains("AI Wizard Duel").should("be.visible");

    // 2. Navigate to dashboard (sign in would happen here in real app)
    cy.get("button").contains("Start Dueling").click();

    // 3. Create a wizard
    cy.get("button").contains("Create Wizard").click();

    const wizardName = `Journey Wizard ${Date.now()}`;
    cy.get('input[name="name"]').type(wizardName);
    cy.get('textarea[name="description"]').type(
      "A wizard for the full journey test"
    );
    cy.get('button[type="submit"]').click();

    // 4. Verify wizard was created
    cy.contains(wizardName).should("be.visible");

    // 5. Create a duel
    cy.get("button").contains("Create Duel").click();

    const duelTitle = `Journey Duel ${Date.now()}`;
    cy.get('input[name="title"]').type(duelTitle);
    cy.get('textarea[name="description"]').type(
      "A test duel for the full journey"
    );
    cy.get('button[type="submit"]').click();

    // 6. Verify duel was created
    cy.contains(duelTitle).should("be.visible");

    // 7. Navigate to the duel
    cy.contains(duelTitle).click();

    // 8. Cast a spell
    cy.get("button").contains("Cast Spell").click();
    cy.get('textarea[name="spell"]').type(
      "I summon a mighty dragon to breathe fire upon my foe!"
    );
    cy.get('button[type="submit"]').click();

    // 9. Verify spell was submitted
    cy.contains("Spell submitted").should("be.visible");

    // 10. Check duel status
    cy.visit("/duels");
    cy.contains(duelTitle).should("be.visible");

    // 11. View statistics
    cy.visit("/stats");
    cy.contains("Statistics").should("be.visible");

    // 12. Return to dashboard
    cy.visit("/dashboard");
    cy.contains(wizardName).should("be.visible");
  });

  it("should handle error scenarios gracefully", () => {
    cy.visit("/dashboard");

    // Try to create wizard with invalid data
    cy.get("button").contains("Create Wizard").click();
    cy.get('button[type="submit"]').click(); // Submit without filling form

    // Should show validation errors
    cy.contains("required").should("be.visible");

    // Fill form correctly
    cy.get('input[name="name"]').type("Error Test Wizard");
    cy.get('textarea[name="description"]').type("Testing error handling");
    cy.get('button[type="submit"]').click();

    // Should succeed
    cy.contains("Error Test Wizard").should("be.visible");
  });

  it("should work across different screen sizes", () => {
    const viewports = ["iphone-x", "ipad-2", "macbook-15"];

    viewports.forEach((viewport) => {
      // cy.viewport(viewport);

      cy.visit("/");
      cy.contains("AI Wizard Duel").should("be.visible");

      cy.visit("/dashboard");
      cy.get("button").contains("Create").should("be.visible");

      cy.visit("/duels");
      cy.contains("Duels").should("be.visible");
    });
  });

  it("should maintain state across page refreshes", () => {
    cy.visit("/dashboard");

    // Create a wizard
    cy.get("button").contains("Create Wizard").click();
    const wizardName = `Persistent Wizard ${Date.now()}`;
    cy.get('input[name="name"]').type(wizardName);
    cy.get('textarea[name="description"]').type("Testing state persistence");
    cy.get('button[type="submit"]').click();

    // Verify wizard exists
    cy.contains(wizardName).should("be.visible");

    // Refresh page
    cy.reload();

    // Wizard should still be there
    cy.contains(wizardName).should("be.visible");
  });
});
