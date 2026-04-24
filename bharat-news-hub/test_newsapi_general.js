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
    const res = await fetch(`https://newsapi.org/v2/top-headlines?category=general&language=en&country=in&pageSize=15&apiKey=${env.VITE_NEWSAPI_KEY}`);
    const data = await res.json();
    console.log("newsapi general:", res.status, JSON.stringify(data, null, 2).slice(0, 500));
}
req();
