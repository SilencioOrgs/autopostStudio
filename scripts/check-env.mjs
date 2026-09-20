#!/usr/bin/env node
/**
 * scripts/check-env.mjs
 * Validates that .env.local has the required variables with the correct shape.
 * Prints ONLY presence/absence and shape checks — NEVER prints values.
 *
 * Usage: node scripts/check-env.mjs
 */

// Node 22+ built-in; loads .env.local into process.env
try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("MISSING  .env.local file not found. Copy .env.example to .env.local and fill in values.");
  process.exit(1);
}

let exitCode = 0;

function check(name, validator) {
  const val = process.env[name];
  if (!val || val.trim() === "") {
    console.log(`MISSING  ${name}`);
    exitCode = 1;
    return;
  }
  const result = validator(val.trim());
  if (result === true) {
    console.log(`OK       ${name}  (length: ${val.trim().length})`);
  } else {
    console.log(`BAD_SHAPE  ${name}  — ${result}`);
    exitCode = 1;
  }
}

// ── Checks ──────────────────────────────────────────────────

check("NEXT_PUBLIC_SUPABASE_URL", (v) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? true : "must be https://";
  } catch {
    return "not a valid URL";
  }
});

check("NEXT_PUBLIC_SUPABASE_ANON_KEY", (v) => {
  // Accept JWT shape (eyJ...) or new-format sb_publishable_...
  const isJwt = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
  const isNew = v.startsWith("sb_publishable_");
  return isJwt || isNew ? true : "expected JWT (eyJ...) or sb_publishable_...";
});

check("SUPABASE_SERVICE_ROLE_KEY", (v) => {
  const isJwt = /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(v);
  const isNew = v.startsWith("sb_secret_");
  return isJwt || isNew ? true : "expected JWT (eyJ...) or sb_secret_...";
});

check("ENCRYPTION_KEY", (v) => {
  try {
    const buf = Buffer.from(v, "base64");
    return buf.length === 32 ? true : `decoded to ${buf.length} bytes, expected 32`;
  } catch {
    return "not valid base64";
  }
});

check("CRON_SECRET", (v) => {
  return v.length >= 32 ? true : `length ${v.length}, need at least 32`;
});

check("GRAPH_API_VERSION", (v) => {
  return /^v\d+\.\d+$/.test(v) ? true : "expected format vN.N (e.g. v26.0)";
});

check("NEXT_PUBLIC_SITE_URL", (v) => {
  try {
    new URL(v);
    return true;
  } catch {
    return "not a valid URL";
  }
});

process.exit(exitCode);
