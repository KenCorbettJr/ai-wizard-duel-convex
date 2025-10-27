// Simple verification script for campaign opponents data
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

// Read the campaign opponents file
const campaignOpponentsPath = path.join(
  __dirname,
  "../convex/campaignOpponents.ts"
);
const content = fs.readFileSync(campaignOpponentsPath, "utf8");

console.log("✅ Campaign opponents file exists and is readable");

// Check if all required exports are present
const requiredExports = [
  "CAMPAIGN_DIFFICULTIES",
  "CAMPAIGN_OPPONENTS_DATA",
  "campaignOpponentValidator",
];

requiredExports.forEach((exportName) => {
  if (content.includes(`export const ${exportName}`)) {
    console.log(`✅ ${exportName} is exported`);
  } else {
    console.log(`❌ ${exportName} is missing`);
  }
});

// Check if we have 10 opponents
const opponentMatches = content.match(/opponentNumber: \d+/g);
if (opponentMatches && opponentMatches.length === 10) {
  console.log("✅ Found 10 campaign opponents");
} else {
  console.log(
    `❌ Expected 10 opponents, found ${opponentMatches ? opponentMatches.length : 0}`
  );
}

// Check difficulty distribution
const beginnerCount = (content.match(/CAMPAIGN_DIFFICULTIES\.BEGINNER/g) || [])
  .length;
const intermediateCount = (
  content.match(/CAMPAIGN_DIFFICULTIES\.INTERMEDIATE/g) || []
).length;
const advancedCount = (content.match(/CAMPAIGN_DIFFICULTIES\.ADVANCED/g) || [])
  .length;

console.log(
  `✅ Difficulty distribution: ${beginnerCount} BEGINNER, ${intermediateCount} INTERMEDIATE, ${advancedCount} ADVANCED`
);

if (beginnerCount === 3 && intermediateCount === 4 && advancedCount === 3) {
  console.log("✅ Correct difficulty distribution");
} else {
  console.log("❌ Incorrect difficulty distribution (should be 3-4-3)");
}

console.log("\n🎯 Campaign opponents data verification complete!");
