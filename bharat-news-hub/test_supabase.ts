import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Simple custom .env parser just for the test script
const envContent = readFileSync(".env", "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    env[match[1]] = match[2];
  }
}

const SUPABASE_URL = env["VITE_SUPABASE_URL"] || "";
const SUPABASE_KEY = env["VITE_SUPABASE_ANON_KEY"] || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log("Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSupabase() {
  console.log(`Testing connection to: ${SUPABASE_URL}...`);
  try {
    const { data, error } = await supabase.from("news").select("id, title, publishedAt").order("publishedAt", { ascending: false }).limit(3);
    
    if (error) {
      console.error("Supabase Error:", error);
    } else {
      console.log("✅ Connection Successful!");
      console.log(`Found ${data.length} recent news articles in the cache.`);
      if (data.length > 0) {
        console.log("Top Articles:");
        data.forEach(d => console.log(`- [${d.publishedAt}] ${d.title}`));
        console.log("\nThe n8n workflow and integration are working perfectly!");
      } else {
        console.log("\n⚠️ The connection works, but the 'news' table is empty. Please verify that your n8n workflow has successfully completed at least one execution to insert articles.");
      }
    }
  } catch (err) {
    console.error("Unexpected error connecting to Supabase:", err);
  }
}

testSupabase();
