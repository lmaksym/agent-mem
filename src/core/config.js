import { readContextFile, writeContextFile } from "./fs.js";

const DEFAULT_CONFIG = {
  auto_commit: false,
  auto_commit_interval: 10,
  reflection: {
    trigger: "manual",
    frequency: 5,
    model: null,
    defrag_threshold: 50,
    defrag_size_kb: 10,
    stale_days: 30,
  },
  system_files_max: 10,
  memory_files_max: 25,
  branch: "main",
};

/**
 * Read config from .context/config.yaml (simple YAML-like parser).
 */
export function readConfig(contextDir) {
  const raw = readContextFile(contextDir, "config.yaml");
  if (!raw) return { ...DEFAULT_CONFIG };

  // Simple YAML parser for flat + one-level nested
  const config = { ...DEFAULT_CONFIG };
  let currentSection = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("#") || !line.trim()) continue;

    const indent = line.length - line.trimStart().length;
    const match = line.trim().match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (!match) continue;

    const [, key, rawVal] = match;
    const val = parseVal(rawVal);

    if (indent === 0) {
      if (rawVal === "") {
        // Section header
        currentSection = key;
        if (typeof config[key] !== "object") config[key] = {};
      } else {
        config[key] = val;
        currentSection = null;
      }
    } else if (currentSection && config[currentSection]) {
      config[currentSection][key] = val;
    }
  }

  return config;
}

/**
 * Write config to .context/config.yaml.
 */
export function writeConfig(contextDir, config) {
  const lines = ["# agent-context configuration"];

  for (const [key, val] of Object.entries(config)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(val)) {
        lines.push(`  ${k}: ${serializeVal(v)}`);
      }
    } else {
      lines.push(`${key}: ${serializeVal(val)}`);
    }
  }

  writeContextFile(contextDir, "config.yaml", lines.join("\n") + "\n");
}

function parseVal(raw) {
  const s = raw.trim().replace(/^['"]|['"]$/g, "");
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "") return null;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

function serializeVal(val) {
  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  return String(val);
}
