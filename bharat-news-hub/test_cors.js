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
    try {
        const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=general&lang=en&country=in&max=1&apikey=${env.VITE_GNEWS_API_KEY_1}`, { method: 'OPTIONS' });
        console.log("GNews CORS Allow-Origin:", res.headers.get("access-control-allow-origin"));
    } catch(e) { }
    try {
        const res2 = await fetch(`https://newsdata.io/api/1/news?language=en&country=in&apikey=${env.VITE_NEWSDATA_API_KEY}`, { method: 'OPTIONS' });
        console.log("NewsData CORS Allow-Origin:", res2.headers.get("access-control-allow-origin"));
    } catch (e) {}
}
req();
