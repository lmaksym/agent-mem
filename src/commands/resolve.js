import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { contextDir as getContextDir } from "../core/context-root.js";
import { commitContext } from "../core/git.js";
import { execSync } from "node:child_process";

/**
 * Find files with merge conflict markers in .context/.
 */
function findConflicted(ctxDir, verbose = false) {
  const conflicted = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      try {
        const stat = statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else {
          const content = readFileSync(full, "utf-8");
          // Check for actual conflict block structure (not just substrings)
          if (/^<<<<<<<\s/m.test(content) && /^=======/m.test(content) && /^>>>>>>>\s/m.test(content)) {
            const relPath = full.slice(ctxDir.length + 1);
            conflicted.push({ path: relPath, fullPath: full, content });
          }
        }
      } catch (err) {
        if (verbose) console.error(`  ⚠️  Could not read ${full}: ${err.message}`);
      }
    }
  };
  walk(ctxDir);
  return conflicted;
}

/**
 * Resolve a single file's merge conflicts.
 *
 * Strategy for .context/ files:
 * - Memory files (append-only entries): keep BOTH sides, deduplicate
 * - Config files: prefer "ours" (local) for settings
 * - Other files: keep both sides concatenated with separator
 */
function resolveFile(relPath, content) {
  const isMemory = relPath.startsWith("memory/") || relPath.startsWith("archive/");
  const isConfig = relPath === "config.yaml";

  if (isConfig) {
    return resolveConfigConflict(content);
  }

  if (isMemory) {
    return resolveAppendOnly(content);
  }

  // Default: keep both sides
  return resolveKeepBoth(content);
}

/**
 * Resolve append-only files (memory) by merging both sides.
 * Deduplicates entries that are exact matches (preserves blank lines and whitespace).
 */
function resolveAppendOnly(content) {
  const lines = content.split("\n");
  const resolved = [];
  let inConflict = false;
  let oursLines = [];
  let theirsLines = [];
  let side = null;

  for (const line of lines) {
    if (line.startsWith("<<<<<<<")) {
      inConflict = true;
      side = "ours";
      oursLines = [];
      theirsLines = [];
      continue;
    }
    if (line === "=======" && inConflict) {
      side = "theirs";
      continue;
    }
    if (line.startsWith(">>>>>>>") && inConflict) {
      // Merge: keep all lines from ours, then unique lines from theirs
      // Exact string match for dedup (not trimmed)
      const seen = new Set(oursLines);
      const merged = [...oursLines];

      for (const l of theirsLines) {
        if (!seen.has(l)) {
          seen.add(l);
          merged.push(l);
        }
      }

      resolved.push(...merged);
      inConflict = false;
      side = null;
      continue;
    }

    if (inConflict) {
      if (side === "ours") oursLines.push(line);
      else theirsLines.push(line);
    } else {
      resolved.push(line);
    }
  }

  return resolved.join("\n");
}

/**
 * Resolve config conflicts by preferring "ours" (local) values.
 */
function resolveConfigConflict(content) {
  const lines = content.split("\n");
  const resolved = [];
  let inConflict = false;
  let side = null;

  for (const line of lines) {
    if (line.startsWith("<<<<<<<")) {
      inConflict = true;
      side = "ours";
      continue;
    }
    if (line === "=======" && inConflict) {
      side = "theirs";
      continue;
    }
    if (line.startsWith(">>>>>>>") && inConflict) {
      inConflict = false;
      side = null;
      continue;
    }

    if (inConflict) {
      // Keep only "ours" lines
      if (side === "ours") {
        resolved.push(line);
      }
    } else {
      resolved.push(line);
    }
  }

  return resolved.join("\n");
}

/**
 * Fallback: keep both sides separated.
 */
function resolveKeepBoth(content) {
  // Just strip conflict markers and keep everything
  return content
    .replace(/^<<<<<<<.*\n/gm, "")
    .replace(/^=======\n/gm, "\n--- merged ---\n\n")
    .replace(/^>>>>>>>.*\n/gm, "");
}

/**
 * Get resolution strategy label for a file path.
 */
function getStrategy(relPath) {
  if (relPath.startsWith("memory/") || relPath.startsWith("archive/")) {
    return "append-only (merge both, deduplicate)";
  }
  if (relPath === "config.yaml") {
    return "prefer-ours (keep local config)";
  }
  return "keep-both (concatenate)";
}

export default async function resolve({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const isDryRun = flags["dry-run"] === true;

  const verbose = flags.verbose === true;
  const conflicted = findConflicted(ctxDir, verbose);

  if (conflicted.length === 0) {
    console.log("✅ No merge conflicts in .context/");
    return;
  }

  console.log(`🔀 RESOLVE${isDryRun ? " (dry run)" : ""}`);
  console.log(`Found ${conflicted.length} conflicted file${conflicted.length > 1 ? "s" : ""}:`);
  console.log("");

  for (const file of conflicted) {
    const strategy = getStrategy(file.path);

    console.log(`  ${file.path} — ${strategy}`);

    if (!isDryRun) {
      const resolved = resolveFile(file.path, file.content);
      writeFileSync(file.fullPath, resolved, "utf-8");
    }
  }

  if (!isDryRun) {
    // Stage resolved files
    try {
      execSync("git add .", { cwd: ctxDir, stdio: "ignore" });
    } catch (err) {
      if (verbose) console.error(`  ⚠️  git add failed: ${err.message}`);
    }

    const hash = commitContext(ctxDir, `resolve: auto-resolved ${conflicted.length} conflict${conflicted.length > 1 ? "s" : ""}`);

    console.log("");
    console.log(`✅ Resolved ${conflicted.length} file${conflicted.length > 1 ? "s" : ""}`);
    if (hash) console.log(`Committed: ${hash}`);
  } else {
    console.log("");
    console.log("Run without --dry-run to apply resolutions.");
  }
}
