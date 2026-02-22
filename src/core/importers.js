import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { writeContextFile } from "./fs.js";

/**
 * Import Claude Code session history into .context/memory/.
 *
 * Claude Code stores sessions at:
 *   ~/.claude/projects/<project-hash>/<session-id>.jsonl
 *
 * Project hash = cwd path with slashes replaced by dashes.
 * Each line is a JSON object with { type, message, ... }.
 * We extract assistant messages and tool results as context.
 */
export function importClaudeHistory(cwd, contextDir) {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const claudeDir = join(home, ".claude", "projects");

  if (!existsSync(claudeDir)) {
    console.log("  ℹ️  No Claude Code history found (~/.claude/projects/ not found)");
    return 0;
  }

  // Find matching project directory
  // Claude uses path with slashes → dashes: /home/user/myapp → -home-user-myapp-
  const projectHash = cwd.replace(/\//g, "-");
  const candidates = readdirSync(claudeDir).filter(
    (d) => d.includes(basename(cwd)) || d === projectHash || d.endsWith(`-${basename(cwd)}-`)
  );

  if (!candidates.length) {
    console.log(`  ℹ️  No Claude Code sessions found for this project`);
    return 0;
  }

  let totalSessions = 0;
  const summaries = [];

  for (const candidate of candidates) {
    const projectDir = join(claudeDir, candidate);
    if (!statSync(projectDir).isDirectory()) continue;

    const jsonlFiles = readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));

    for (const file of jsonlFiles.slice(-5)) {
      // Import last 5 sessions max
      try {
        const content = readFileSync(join(projectDir, file), "utf-8");
        const messages = content
          .split("\n")
          .filter((l) => l.trim())
          .map((l) => {
            try { return JSON.parse(l); } catch { return null; }
          })
          .filter(Boolean);

        // Extract human messages and assistant summaries
        const humanMsgs = messages
          .filter((m) => m.type === "human" && m.message?.content)
          .map((m) => typeof m.message.content === "string" ? m.message.content : JSON.stringify(m.message.content))
          .slice(0, 10); // First 10 human messages as context

        if (humanMsgs.length > 0) {
          const sessionId = basename(file, ".jsonl").slice(0, 8);
          summaries.push(`### Session ${sessionId}\n${humanMsgs.map((m) => `- ${m.slice(0, 200)}`).join("\n")}`);
          totalSessions++;
        }
      } catch {}
    }
  }

  if (summaries.length) {
    writeContextFile(contextDir, "memory/imported-claude-sessions.md", [
      "---",
      'description: "Imported from Claude Code session history"',
      "---",
      "",
      "# Claude Code Session History",
      "",
      `Imported ${totalSessions} sessions.`,
      "",
      ...summaries,
      "",
    ].join("\n"));
    console.log(`  📥 Imported ${totalSessions} Claude Code sessions → memory/imported-claude-sessions.md`);
  }

  return totalSessions;
}

/**
 * Import Codex session history into .context/memory/.
 *
 * Codex stores sessions at:
 *   ~/.codex/sessions/YYYY/MM/DD/<session-name>.jsonl
 *
 * Each line is a JSON object. We extract the conversation content.
 */
export function importCodexHistory(cwd, contextDir) {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const codexDir = join(home, ".codex", "sessions");

  if (!existsSync(codexDir)) {
    console.log("  ℹ️  No Codex history found (~/.codex/sessions/ not found)");
    return 0;
  }

  // Walk the date-based directory structure, find recent sessions
  const jsonlFiles = [];
  const walkDates = (dir, depth = 0) => {
    if (depth > 4 || !existsSync(dir)) return;
    try {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walkDates(full, depth + 1);
        } else if (entry.endsWith(".jsonl")) {
          jsonlFiles.push({ path: full, name: entry, mtime: statSync(full).mtimeMs });
        }
      }
    } catch {}
  };

  walkDates(codexDir);

  if (!jsonlFiles.length) {
    console.log("  ℹ️  No Codex sessions found");
    return 0;
  }

  // Sort by most recent, take last 5
  jsonlFiles.sort((a, b) => b.mtime - a.mtime);
  const recent = jsonlFiles.slice(0, 5);

  const summaries = [];

  for (const file of recent) {
    try {
      const content = readFileSync(file.path, "utf-8");
      const lines = content
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => {
          try { return JSON.parse(l); } catch { return null; }
        })
        .filter(Boolean);

      // Extract messages — Codex format varies, look for common patterns
      const msgs = lines
        .filter((m) => m.role === "user" || m.type === "message" || m.content)
        .map((m) => {
          const text = m.content || m.message?.content || m.text || "";
          return typeof text === "string" ? text : JSON.stringify(text);
        })
        .filter((t) => t.length > 0 && t.length < 500)
        .slice(0, 10);

      if (msgs.length) {
        const sessionId = basename(file.name, ".jsonl").slice(0, 20);
        summaries.push(`### Session ${sessionId}\n${msgs.map((m) => `- ${m.slice(0, 200)}`).join("\n")}`);
      }
    } catch {}
  }

  if (summaries.length) {
    writeContextFile(contextDir, "memory/imported-codex-sessions.md", [
      "---",
      'description: "Imported from Codex session history"',
      "---",
      "",
      "# Codex Session History",
      "",
      `Imported ${summaries.length} sessions.`,
      "",
      ...summaries,
      "",
    ].join("\n"));
    console.log(`  📥 Imported ${summaries.length} Codex sessions → memory/imported-codex-sessions.md`);
  }

  return summaries.length;
}
