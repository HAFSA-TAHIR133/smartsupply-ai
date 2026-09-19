import fs from "fs";
import path from "path";

// Zero-dependency env loader supporting monorepo root and web directory .env files
function loadEnvFromPaths() {
  const possiblePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../.env.local"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../../.env.local"),
    path.resolve(process.cwd(), "apps/web/.env"),
    path.resolve(process.cwd(), "apps/web/.env.local"),
  ];

  for (const filePath of possiblePaths) {
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
      } catch {
        // Silently skip unreadable files
      }
    }
  }
}

loadEnvFromPaths();

export function getEnv(key, fallback = undefined) {
  return process.env[key] ?? fallback;
}
