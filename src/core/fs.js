import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { join, relative, basename, dirname } from "node:path";

/**
 * Read a file from .context/, returns content or null.
 */
export function readContextFile(contextDir, relPath) {
  const fullPath = join(contextDir, relPath);
  if (!existsSync(fullPath)) return null;
  return readFileSync(fullPath, "utf-8");
}

/**
 * Write a file to .context/, creating directories as needed.
 */
export function writeContextFile(contextDir, relPath, content) {
  const fullPath = join(contextDir, relPath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf-8");
}

/**
 * Move a file within .context/.
 */
export function moveContextFile(contextDir, fromRel, toRel) {
  const fromFull = join(contextDir, fromRel);
  const toFull = join(contextDir, toRel);
  if (!existsSync(fromFull)) throw new Error(`File not found: ${fromRel}`);
  mkdirSync(dirname(toFull), { recursive: true });
  renameSync(fromFull, toFull);
}

/**
 * Parse frontmatter from a markdown file.
 * Returns { description, limit, readOnly, content }.
 */
export function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { description: null, limit: null, readOnly: false, content: text };

  const frontmatter = match[1];
  const content = match[2];
  const desc = frontmatter.match(/description:\s*['"]?(.*?)['"]?\s*$/m)?.[1] || null;
  const limit = frontmatter.match(/limit:\s*(\d+)/)?.[1] ? parseInt(frontmatter.match(/limit:\s*(\d+)/)[1]) : null;
  const readOnly = /read_only:\s*true/i.test(frontmatter);

  return { description: desc, limit, readOnly, content };
}

/**
 * Build a tree representation of .context/ directory.
 * Returns array of { path, name, isDir, description, size }.
 */
export function buildTree(contextDir, subDir = "", depth = 0, maxDepth = 4) {
  const entries = [];
  const fullDir = join(contextDir, subDir);

  if (!existsSync(fullDir)) return entries;
  if (depth > maxDepth) return entries;

  const items = readdirSync(fullDir).filter((n) => !n.startsWith(".")).sort();

  for (const name of items) {
    const relPath = subDir ? `${subDir}/${name}` : name;
    const fullPath = join(fullDir, name);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      entries.push({ path: relPath, name, isDir: true, depth });
      entries.push(...buildTree(contextDir, relPath, depth + 1, maxDepth));
    } else if (name.endsWith(".md") || name.endsWith(".yaml") || name.endsWith(".yml")) {
      const content = readFileSync(fullPath, "utf-8");
      const { description } = parseFrontmatter(content);
      entries.push({
        path: relPath,
        name,
        isDir: false,
        depth,
        description: description || summarizeLine(content),
        size: stat.size,
      });
    }
  }

  return entries;
}

/**
 * Get the first meaningful line of content as a summary.
 */
function summarizeLine(text) {
  const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("---") && !l.startsWith("#"));
  const first = lines[0]?.trim() || "";
  return first.length > 80 ? first.slice(0, 77) + "..." : first;
}

/**
 * List files in a directory (non-recursive).
 */
export function listFiles(contextDir, subDir) {
  const fullDir = join(contextDir, subDir);
  if (!existsSync(fullDir)) return [];
  return readdirSync(fullDir).filter((n) => !n.startsWith("."));
}

/**
 * Count files recursively in a directory.
 */
export function countFiles(contextDir, subDir) {
  const fullDir = join(contextDir, subDir);
  if (!existsSync(fullDir)) return 0;
  let count = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else count++;
    }
  };
  walk(fullDir);
  return count;
}
