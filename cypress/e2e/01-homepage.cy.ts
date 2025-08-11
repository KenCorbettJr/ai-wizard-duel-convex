describe("Homepage", () => {
  beforeEach(() => {
    // Ensure Convex emulator is ready
    cy.waitForConvex();
    cy.visit("/");
  });

  it("should display the main hero section", () => {
    cy.contains("AI Wizard Duel").should("be.visible");
    cy.contains("Where Wizards Clash and Legends Rise!").should("be.visible");
    cy.get("button").contains("Start Dueling").should("be.visible");
  });

  it("should have all feature sections visible", () => {
    // Check for main sections
    cy.contains("Unique Gameplay Mechanics").should("be.visible");
    cy.contains("Only Limited By Your Imagination").should("be.visible");
    cy.contains("Master the Art of Magical Combat").should("be.visible");
    cy.contains("Epic Magical Battles").should("be.visible");
    cy.contains("Fun and Hilarious Duels").should("be.visible");
    cy.contains("Leaderboard").should("be.visible");
  });

  it("should have working navigation links", () => {
    // Test leaderboard link
    cy.get('a[href="/leaderboard"]').should("be.visible").click();
    cy.url().should("include", "/leaderboard");

    // Go back to home
    cy.visit("/");

    // Test watch duels link
    cy.get('a[href="/duels/watch"]').should("be.visible").click();
    cy.url().should("include", "/duels/watch");
  });

  it("should display feature cards with icons", () => {
    // Check for feature cards
    cy.contains("Strategic Planning").should("be.visible");
    cy.contains("Simultaneous Actions").should("be.visible");
    cy.contains("Creative Freedom").should("be.visible");
    cy.contains("Dynamic Storytelling").should("be.visible");
  });

  it("should be responsive on mobile", () => {
    cy.viewport("iphone-x");
    cy.contains("AI Wizard Duel").should("be.visible");
    cy.get("button").contains("Start Dueling").should("be.visible");

    // Check that content is still accessible on mobile
    cy.contains("Unique Gameplay Mechanics").should("be.visible");
  });
});
