describe("Wizard Management", () => {
  beforeEach(() => {
    cy.waitForConvex();
    // In emulator mode, you might need to set up authentication differently
    // cy.signInTestUser()
  });

  it("should display wizards page", () => {
    cy.visit("/wizards");
    cy.contains("Wizards").should("be.visible");
  });

  it("should allow creating a new wizard", () => {
    cy.visit("/dashboard");

    // Look for create wizard button or form
    cy.get("button").contains("Create").first().click();

    // Fill out wizard creation form
    const wizardName = `Test Wizard ${Date.now()}`;
    const wizardDescription = "A powerful wizard created for testing purposes";

    cy.get('input[name="name"]').type(wizardName);
    cy.get('textarea[name="description"]').type(wizardDescription);

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Verify wizard was created
    cy.contains(wizardName).should("be.visible");
  });

  it("should display wizard details", () => {
    cy.visit("/wizards");

    // Click on first wizard card (if any exist)
    cy.get('[data-testid="wizard-card"]').first().click();

    // Should navigate to wizard detail page
    cy.url().should("include", "/wizards/");

    // Should display wizard information
    cy.contains("Wizard").should("be.visible");
  });

  it("should handle wizard editing", () => {
    cy.visit("/dashboard");

    // Look for edit button on existing wizard
    cy.get('[data-testid="edit-wizard"]').first().click();

    // Update wizard name
    const updatedName = `Updated Wizard ${Date.now()}`;
    cy.get('input[name="name"]').clear().type(updatedName);

    // Save changes
    cy.get("button").contains("Save").click();

    // Verify changes were saved
    cy.contains(updatedName).should("be.visible");
  });
});
