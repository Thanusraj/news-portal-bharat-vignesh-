import fs from 'fs';

const envContent = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2];
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const gnews_keys = [env.VITE_GNEWS_API_KEY_1, env.VITE_GNEWS_API_KEY_2, env.VITE_GNEWS_API_KEY_3].filter(Boolean);

async function checkGNewsData() {
    const url = `https://gnews.io/api/v4/top-headlines?lang=en&country=in&max=3&apikey=${gnews_keys[0]}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("GNews articles[0] image:", data.articles[0]?.image);
        console.log("GNews articles[0] title:", data.articles[0]?.title);
        console.log("GNews articles[0] desc:", data.articles[0]?.description);
        console.log("GNews array length:", data.articles.length);
    } catch(e) {
        console.error(e);
    }
}

checkGNewsData();
