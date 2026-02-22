import { contextDir as getContextDir } from "../core/context-root.js";
import { readConfig } from "../core/config.js";
import { commitCount, lastCommit, hasChanges } from "../core/git.js";
import { countFiles, listFiles } from "../core/fs.js";
import { existsSync } from "node:fs";
import { join } from "node:path";

export default async function status({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);
  const config = readConfig(ctxDir);
  const projectName = root.split("/").pop();

  const commits = commitCount(ctxDir);
  const last = lastCommit(ctxDir);
  const dirty = hasChanges(ctxDir);
  const systemCount = countFiles(ctxDir, "system");
  const memoryCount = countFiles(ctxDir, "memory");
  const reflectionCount = countFiles(ctxDir, "reflections");

  // Count branches
  const branchDir = join(ctxDir, "branches");
  const branchCount = existsSync(branchDir) ? listFiles(ctxDir, "branches").length : 0;

  console.log(`📊 STATUS: ${projectName}`);
  console.log(`Branch: ${config.branch || "main"} | Commits: ${commits}${dirty ? " ⚠️ uncommitted changes" : ""}`);
  if (last) console.log(`Last: "${last.message}" (${last.timeAgo})`);
  console.log(`Files: ${systemCount} pinned, ${memoryCount} memory, ${reflectionCount} reflections`);
  console.log(`Branches: ${branchCount}`);
  console.log(`Config: auto_commit=${config.auto_commit} | reflection=${config.reflection?.trigger || "manual"}`);
}
