/**
 * Parse agent's structured reflection output into sections.
 * Fuzzy section-header matching with graceful fallback.
 */

const SECTION_MAP = [
  { key: "patterns", match: ["pattern"] },
  { key: "decisions", match: ["decision", "validated"] },
  { key: "contradictions", match: ["contradict"] },
  { key: "stale", match: ["stale"] },
  { key: "gaps", match: ["gap", "new entr"] },
  { key: "themes", match: ["theme"] },
  { key: "summary", match: ["summar"] },
];

/**
 * Normalize a section header to a known key.
 */
function normalizeSection(header) {
  const lower = header.toLowerCase();
  for (const { key, match } of SECTION_MAP) {
    if (match.some((m) => lower.includes(m))) return key;
  }
  return lower.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Parse reflection text into { sections, raw, recognized }.
 * sections: { key: string[] } — lines under each section
 * raw: original text
 * recognized: whether any known sections were found
 */
export function parseReflection(text) {
  const sections = {};
  let currentSection = null;
  let recognizedCount = 0;

  for (const line of text.split("\n")) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      currentSection = normalizeSection(headerMatch[1].trim());
      if (!sections[currentSection]) sections[currentSection] = [];
      // Check if this is a known section
      const known = SECTION_MAP.some((s) => s.key === currentSection);
      if (known) recognizedCount++;
      continue;
    }

    if (currentSection && line.trim()) {
      sections[currentSection].push(line);
    }
  }

  return {
    sections,
    raw: text,
    recognized: recognizedCount > 0,
  };
}

/**
 * Extract structured "Gaps Filled" entries.
 * Looks for "type: <category>" and "text: <content>" patterns.
 * Returns array of { type, text }.
 */
export function extractGaps(lines) {
  if (!lines || !lines.length) return [];

  const entries = [];
  let currentType = null;
  let currentText = null;

  for (const line of lines) {
    const trimmed = line.trim().replace(/^-\s*/, "");

    const typeMatch = trimmed.match(/^type:\s*(decision|pattern|mistake|note)/i);
    if (typeMatch) {
      // If we had a previous entry, push it
      if (currentType && currentText) {
        entries.push({ type: currentType.toLowerCase(), text: currentText });
      }
      currentType = typeMatch[1];
      currentText = null;
      continue;
    }

    const textMatch = trimmed.match(/^text:\s*(.+)/);
    if (textMatch) {
      currentText = textMatch[1].trim();
      continue;
    }

    // If line doesn't match type/text pattern, treat as inline entry
    // e.g. "- type: pattern, text: Always do X"
    const inlineMatch = trimmed.match(/type:\s*(decision|pattern|mistake|note)\s*[,;]\s*text:\s*(.+)/i);
    if (inlineMatch) {
      entries.push({ type: inlineMatch[1].toLowerCase(), text: inlineMatch[2].trim() });
      currentType = null;
      currentText = null;
    }
  }

  // Push last entry
  if (currentType && currentText) {
    entries.push({ type: currentType.toLowerCase(), text: currentText });
  }

  return entries;
}

/**
 * Extract stale entry references from the Stale Entries section.
 * Looks for patterns like "memory/file.md: entry text" or "memory/file.md line N: text"
 * Returns array of { file, text }.
 */
export function extractStaleEntries(lines) {
  if (!lines || !lines.length) return [];

  const entries = [];
  for (const line of lines) {
    const trimmed = line.trim().replace(/^-\s*/, "");
    // Pattern: "memory/file.md: some entry text"
    const match = trimmed.match(/^(memory\/[\w-]+\.md)(?:\s*(?:line\s*\d+)?)\s*[:—-]\s*(.+)/i);
    if (match) {
      entries.push({ file: match[1], text: match[2].trim() });
    }
  }

  return entries;
}

/**
 * Get the summary text from parsed sections.
 */
export function extractSummary(sections) {
  if (!sections.summary || !sections.summary.length) return null;
  return sections.summary.join(" ").trim();
}
