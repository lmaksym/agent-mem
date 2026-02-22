import { existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

/**
 * Walk up from `cwd` looking for a .context/ directory.
 * Returns the project root (parent of .context/) or null.
 */
export function findContextRoot(cwd) {
  let dir = resolve(cwd);
  const root = dirname(dir) === dir ? dir : "/"; // filesystem root

  while (true) {
    if (existsSync(join(dir, ".context"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return null;
}

/**
 * Get the .context/ directory path from project root.
 */
export function contextDir(projectRoot) {
  return join(projectRoot, ".context");
}
