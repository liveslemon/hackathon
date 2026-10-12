import fs from "node:fs";
import path from "node:path";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const cwd = process.cwd();
const localEnvPath = path.join(cwd, ".env.local");
const standardEnvPath = path.join(cwd, ".env");

let envText = "";
if (fs.existsSync(localEnvPath)) {
  envText += "\n" + fs.readFileSync(localEnvPath, "utf8");
}
if (fs.existsSync(standardEnvPath)) {
  envText += "\n" + fs.readFileSync(standardEnvPath, "utf8");
}

const missing = required.filter((key) => {
  const envVal = process.env[key];
  if (envVal && envVal.trim() !== "") return false;
  const re = new RegExp(`^${key}=.+`, "m");
  return !re.test(envText);
});

if (missing.length > 0) {
  console.error("\x1b[31m[ERROR] Missing required environment variables:\x1b[0m");
  for (const item of missing) {
    console.error(`  - \x1b[33m${item}\x1b[0m`);
  }
  console.error("\nPlease copy .env.example to .env.local and populate the values:");
  console.error("  cp .env.example .env.local\n");
  process.exit(1);
}

console.log("\x1b[32m✓ Environment validation passed.\x1b[0m");
