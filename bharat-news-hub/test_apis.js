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
const newsapi_key = env.VITE_NEWSAPI_KEY;
const newsdata_key = env.VITE_NEWSDATA_API_KEY;
const thenewsapi_key = env.VITE_THENEWSAPI_KEY;
const worldnews_key = env.VITE_WORLDNEWS_KEY;

async function testApi(name, url) {
    console.log(`Checking ${name}...`);
    try {
        const res = await fetch(url);
        if(!res.ok) {
            const text = await res.text();
            console.log(`❌ ${name} failed: ${res.status} ${text}`);
            return false;
        }
        const data = await res.json();
        console.log(`✅ ${name} succeeded! (Data size: ${JSON.stringify(data).length})`);
        return true;
    } catch (e) {
        console.log(`❌ ${name} error: ${e.message}`);
        return false;
    }
}

async function runTests() {
    let success = false;
    if (gnews_keys.length > 0) {
        success = await testApi("GNews", `https://gnews.io/api/v4/top-headlines?lang=en&country=in&max=5&apikey=${gnews_keys[0]}`) || success;
    } else {
        console.log("No GNews keys.");
    }
    
    if (newsapi_key) {
        success = await testApi("NewsAPI", `https://newsapi.org/v2/top-headlines?language=en&country=in&pageSize=5&apiKey=${newsapi_key}`) || success;
    } else {
        console.log("No NewsAPI key.");
    }
    
    if (newsdata_key) {
        success = await testApi("NewsData", `https://newsdata.io/api/1/news?language=en&country=in&apikey=${newsdata_key}`) || success;
    } else {
        console.log("No NewsData key.");
    }
    
    if (thenewsapi_key) {
        success = await testApi("TheNewsAPI", `https://api.thenewsapi.com/v1/news/top?locale=in&language=en&limit=5&api_token=${thenewsapi_key}`) || success;
    } else {
        console.log("No TheNewsAPI key.");
    }

    if (worldnews_key) {
        success = await testApi("WorldNewsAPI", `https://api.worldnewsapi.com/search-news?source-country=in&language=en&number=5&api-key=${worldnews_key}`) || success;
    } else {
        console.log("No WorldNewsAPI key.");
    }
    
    process.exit(0);
}

runTests();
