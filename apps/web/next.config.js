const fs = require("fs");
const path = require("path");

// Load .env and .env.local from both root and apps/web monorepo paths
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (e) {
      console.warn(`Could not read env file at ${filePath}:`, e.message);
    }
  }
}

// Load env files in order of precedence
[
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, ".env.local"),
].forEach(loadEnvFile);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;

