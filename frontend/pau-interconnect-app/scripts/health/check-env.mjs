import fs from "node:fs";
import path from "node:path";

const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const cwd = process.cwd();
const localEnvPath = path.join(cwd, ".env.local");

const envText = fs.existsSync(localEnvPath)
  ? fs.readFileSync(localEnvPath, "utf8")
  : "";

const missing = required.filter((key) => {
  if (process.env[key]) return false;
  const re = new RegExp(`^${key}=.+$`, "m");
  return !re.test(envText);
});

if (missing.length > 0) {
  console.error("Missing required environment variables:");
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log("Environment validation passed.");
