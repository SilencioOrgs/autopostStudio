#!/usr/bin/env node
/**
 * scripts/check-secrets.mjs
 * Scans tracked files for secrets that should never be committed.
 *
 * Usage: node scripts/check-secrets.mjs
 * Add to npm scripts: "check:secrets": "node scripts/check-secrets.mjs"
 * Optional pre-commit hook: .git/hooks/pre-commit (see docs/SECURITY.md)
 */

import { execSync } from "node:child_process";

// Get list of tracked files (skip package-lock.json and binary-ish files)
let files;
try {
  files = execSync("git ls-files", { encoding: "utf-8" })
    .split("\n")
    .filter(Boolean)
    .filter((f) => !f.includes("package-lock.json"))
    .filter((f) => !f.match(/\.(png|jpg|jpeg|gif|ico|woff2?|ttf|eot|svg|webp|mp4|webm)$/i))
    .filter((f) => !f.startsWith("node_modules/"));
} catch {
  console.error("ERROR: git ls-files failed. Are you in a git repository?");
  process.exit(1);
}

const patterns = [
  {
    name: "JWT token (Supabase/auth key)",
    regex: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "Google API key",
    regex: /AIza[0-9A-Za-z_-]{35}/,
  },
  {
    name: "Facebook access token",
    regex: /EAA[0-9A-Za-z]{30,}/,
  },
  {
    name: "Supabase service role key (new format)",
    regex: /sb_secret_[A-Za-z0-9_-]{10,}/,
  },
  {
    name: "PEM private key block",
    regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/,
  },
];

import { readFileSync } from "node:fs";

let hitCount = 0;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf-8");
  } catch {
    continue; // skip unreadable files (e.g. deleted but tracked)
  }

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments that describe patterns (like this script itself or docs)
    if (
      line.trimStart().startsWith("//") ||
      line.trimStart().startsWith("*") ||
      line.trimStart().startsWith("#") ||
      line.trimStart().startsWith("<!--") ||
      line.trimStart().startsWith("|")
    ) {
      continue;
    }

    // Skip regex-pattern definitions (like in this very script or test files)
    if (line.includes("regex:") || line.includes("new RegExp") || line.includes("/eyJ")) {
      continue;
    }

    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        console.error(`HIT  ${file}:${i + 1}  ${pattern.name}`);
        hitCount++;
      }
    }
  }
}

if (hitCount > 0) {
  console.error(`\n${hitCount} secret(s) found. Remove them before committing.`);
  process.exit(1);
} else {
  console.log("OK  No secrets found in tracked files.");
  process.exit(0);
}
