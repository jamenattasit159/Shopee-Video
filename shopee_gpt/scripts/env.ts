import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// MCP can start outside the application directory. Load the same private local
// configuration as Next before application modules resolve storage locations.
const appDir = fileURLToPath(new URL("../", import.meta.url));
const localEnv = path.join(appDir, ".env.local");
if (existsSync(localEnv)) process.loadEnvFile(localEnv);
process.env.STUDIO_DATA_DIR ||= path.join(appDir, "data");
