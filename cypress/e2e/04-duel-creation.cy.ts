describe("Duel Creation and Management", () => {
  beforeEach(() => {
    cy.waitForConvex();
    // cy.signInTestUser()
  });

  it("should display duels page", () => {
    cy.visit("/duels");
    cy.contains("Duels").should("be.visible");
  });

  it("should allow creating a new duel", () => {
    cy.visit("/dashboard");

    // Look for create duel button
    cy.get("button").contains("Create Duel").click();

    // Fill out duel creation form
    const duelTitle = `Epic Test Duel ${Date.now()}`;

    cy.get('input[name="title"]').type(duelTitle);
    cy.get('textarea[name="description"]').type("A test duel for e2e testing");

    // Select wizard (assuming dropdown exists)
    cy.get('select[name="wizardId"]').select(0);

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify duel was created
    cy.contains(duelTitle).should("be.visible");
  });

  it("should display duel details", () => {
    cy.visit("/duels");

    // Click on first duel card (if any exist)
    cy.get('[data-testid="duel-card"]').first().click();

    // Should navigate to duel detail page
    cy.url().should("include", "/duels/");

    // Should display duel information
    cy.contains("Duel").should("be.visible");
  });

  it("should allow joining a duel", () => {
    cy.visit("/duels");

    // Look for join duel button
    cy.get("button").contains("Join").first().click();

    // Should show join duel form or redirect to duel page
    cy.url().should("include", "/duels/");
  });

  it("should handle duel rounds", () => {
    // Navigate to an active duel
    cy.visit("/duels");
    cy.get('[data-testid="active-duel"]').first().click();

    // Cast a spell
    cy.get("button").contains("Cast Spell").click();

    // Fill out spell form
    cy.get('textarea[name="spell"]').type(
      "I summon a mighty fireball to strike my opponent!"
    );

    // Submit spell
    cy.get('button[type="submit"]').click();

    // Verify spell was submitted
    cy.contains("Spell submitted").should("be.visible");
  });

  it("should display duel statistics", () => {
    cy.visit("/stats");

    // Should show statistics page
    cy.contains("Statistics").should("be.visible");

    // Should display various stats
    cy.contains("Total Duels").should("be.visible");
    cy.contains("Wins").should("be.visible");
    cy.contains("Losses").should("be.visible");
  });
});
