import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

// 1. List buckets
const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
console.log("Storage buckets:", buckets, "Error:", bucketsErr);

// 2. Check generations table
const { data: gens, error: gensErr } = await supabase
  .from("generations")
  .select("id, prompt_id, storage_path, status, created_at")
  .order("created_at", { ascending: false })
  .limit(5);

console.log("Generations rows:", gens, "Error:", gensErr);

// 3. Try signing one path if any
if (gens && gens[0]?.storage_path) {
  const path = gens[0].storage_path;
  const { data: signed, error: signErr } = await supabase.storage
    .from("generated-images")
    .createSignedUrl(path, 3600);
  console.log("Signing test for path:", path, "Signed:", signed, "Error:", signErr);
}
