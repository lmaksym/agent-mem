import { contextDir as getContextDir } from "../core/context-root.js";
import { commitContext, hasChanges, commitCount } from "../core/git.js";
import { readConfig } from "../core/config.js";

export default async function commit({ args, flags }) {
  const root = flags._contextRoot;
  const ctxDir = getContextDir(root);

  if (!hasChanges(ctxDir)) {
    console.log("ℹ️  No changes to commit.");
    return;
  }

  const message = args.length ? args.join(" ") : `checkpoint ${new Date().toISOString().slice(0, 16)}`;
  const hash = commitContext(ctxDir, message);

  if (!hash) {
    console.log("ℹ️  No changes to commit.");
    return;
  }

  const count = commitCount(ctxDir);
  console.log(`✅ COMMITTED: "${message}"`);
  console.log(`Commit: ${hash} | Total: ${count}`);
}
