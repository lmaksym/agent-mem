import { contextDir as getContextDir } from "../core/context-root.js";
import { readConfig, writeConfig } from "../core/config.js";

export default async function config({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const cfg = readConfig(ctxDir);

  // config set <key> <value>
  if (args[0] === "set" && args.length >= 3) {
    const key = args[1];
    const val = args[2];

    // Handle nested keys (e.g., reflection.trigger)
    const parts = key.split(".");
    if (parts.length === 2 && cfg[parts[0]] && typeof cfg[parts[0]] === "object") {
      cfg[parts[0]][parts[1]] = parseConfigVal(val);
    } else {
      cfg[key] = parseConfigVal(val);
    }

    writeConfig(ctxDir, cfg);
    console.log(`✅ CONFIG: ${key} = ${val}`);
    return;
  }

  // Show config
  console.log(`⚙️  CONFIG (.context/config.yaml):\n`);
  for (const [key, val] of Object.entries(cfg)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      console.log(`  ${key}:`);
      for (const [k, v] of Object.entries(val)) {
        console.log(`    ${k}: ${v}`);
      }
    } else {
      console.log(`  ${key}: ${val}`);
    }
  }
}

function parseConfigVal(s) {
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null") return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return s;
}
