#!/usr/bin/env node
/**
 * scripts/test-cloudflare.mjs
 * Simple script to test Cloudflare Workers AI credentials directly.
 *
 * Usage: node scripts/test-cloudflare.mjs
 */

import fs from "fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  console.error("❌ Could not load .env.local");
  process.exit(1);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || accountId.includes("your-cloudflare")) {
  console.error("❌ CLOUDFLARE_ACCOUNT_ID is missing or set to placeholder in .env.local");
  process.exit(1);
}

if (!apiToken || apiToken.includes("your-cloudflare")) {
  console.error("❌ CLOUDFLARE_API_TOKEN is missing or set to placeholder in .env.local");
  process.exit(1);
}

const model = "@cf/black-forest-labs/flux-1-schnell";
const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`;

console.log(`Connecting to Cloudflare Workers AI...`);
console.log(`Model:    ${model}`);
console.log(`Endpoint: https://api.cloudflare.com/client/v4/accounts/***/ai/run/${model}`);

const start = Date.now();

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "A modern architectural Filipino home with lush tropical garden, photorealistic, 8k",
    }),
  });

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Request failed (${response.status}):\n${errorText}`);
    process.exit(1);
  }

  let byteLength = 0;
  if (contentType.startsWith("image/")) {
    const buffer = Buffer.from(await response.arrayBuffer());
    byteLength = buffer.length;
    fs.writeFileSync("test-output.png", buffer);
  } else {
    const json = await response.json();
    if (json.result?.image) {
      const cleaned = json.result.image.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(cleaned, "base64");
      byteLength = buffer.length;
      fs.writeFileSync("test-output.png", buffer);
    }
  }

  console.log(`✅ Success! Generated image in ${duration}s (${(byteLength / 1024).toFixed(1)} KB)`);
  console.log(`Saved sample image to test-output.png`);
} catch (err) {
  console.error(`❌ Network or fetch error:`, err.message);
  process.exit(1);
}
