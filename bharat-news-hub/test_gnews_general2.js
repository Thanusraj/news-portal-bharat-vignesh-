import fs from 'fs';

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) {val = val.slice(1,-1)}
    env[match[1]] = val;
  }
}
async function req() {
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=15&apikey=${env.VITE_GNEWS_API_KEY_1}`);
    const data = await res.json();
    console.log("gnews general data:", JSON.stringify(data, null, 2));
}
req();
