describe("Emulator Mode Specific Tests", () => {
  beforeEach(() => {
    cy.waitForConvex();
  });

  it("should connect to local Convex backend", () => {
    // Verify we're connecting to the emulator
    cy.request(`${Cypress.env("CONVEX_URL")}/version`).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("version");
    });
  });

  it("should handle mock AI services", () => {
    cy.visit("/dashboard");

    // Create a wizard to test AI image generation
    cy.get("button").contains("Create Wizard").click();

    const wizardName = `Mock AI Wizard ${Date.now()}`;
    cy.get('input[name="name"]').type(wizardName);
    cy.get('textarea[name="description"]').type("Testing mock AI services");

    // Submit and wait for image generation (should use mocks in emulator)
    cy.get('button[type="submit"]').click();

    // Verify wizard was created with mock image
    cy.contains(wizardName).should("be.visible");

    // Check that image placeholder or mock image is displayed
    cy.get('[data-testid="wizard-image"]').should("exist");
  });

  it("should test spell processing with mocks", () => {
    // Navigate to a duel and cast a spell
    cy.visit("/duels");

    // Join or create a test duel
    cy.get("button").contains("Create Duel").click();

    const duelTitle = `Mock Spell Test ${Date.now()}`;
    cy.get('input[name="title"]').type(duelTitle);
    cy.get('button[type="submit"]').click();

    // Cast a spell to test AI text generation mocks
    cy.get("button").contains("Cast Spell").click();
    cy.get('textarea[name="spell"]').type(
      "I cast a test spell for the emulator!"
    );
    cy.get('button[type="submit"]').click();

    // Verify spell was processed (should use mock AI)
    cy.contains("Spell submitted").should("be.visible");
  });

  it("should verify emulator database operations", () => {
    // Test that data persists in emulator database
    const testData = `Test Data ${Date.now()}`;

    cy.visit("/dashboard");
    cy.get("button").contains("Create Wizard").click();
    cy.get('input[name="name"]').type(testData);
    cy.get('textarea[name="description"]').type("Testing database persistence");
    cy.get('button[type="submit"]').click();

    // Refresh page and verify data persists
    cy.reload();
    cy.contains(testData).should("be.visible");
  });

  it("should handle emulator-specific error scenarios", () => {
    // Test error handling when services are unavailable
    cy.visit("/dashboard");

    // Try to create content that might fail in emulator
    cy.get("button").contains("Create Wizard").click();

    // Submit form with invalid data to test error handling
    cy.get('input[name="name"]').type(""); // Empty name
    cy.get('button[type="submit"]').click();

    // Should display validation error
    cy.contains("required").should("be.visible");
  });

  it("should test real-time updates in emulator", () => {
    // Test that real-time updates work with emulator
    cy.visit("/duels");

    // Create a duel
    cy.get("button").contains("Create Duel").click();
    const duelTitle = `Real-time Test ${Date.now()}`;
    cy.get('input[name="title"]').type(duelTitle);
    cy.get('button[type="submit"]').click();

    // Verify duel appears in list (real-time update)
    cy.contains(duelTitle).should("be.visible");
  });
});
