import dotenv from "dotenv";

// Load environment variables immediately before any other module executes
dotenv.config();

// Now initialize New Relic if license key is configured
if (process.env.NEW_RELIC_LICENSE_KEY) {
  try {
    await import("newrelic");
    console.log("✅ New Relic Agent initialized successfully with license key.");
  } catch (err) {
    console.warn("⚠️ New Relic initialization skipped or failed:", err.message);
  }
} else {
  console.log("ℹ️ New Relic skipped: NEW_RELIC_LICENSE_KEY is not set in environment.");
}
