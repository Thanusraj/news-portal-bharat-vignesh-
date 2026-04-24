async function run() {
    try {
        const url1 = "https://api.thenewsapi.com/v1/news/top?locale=in&language=en&limit=5&api_token=DZ4qZGob3z1YzBSr1V9nY69XJS5PSmluvUJgXQNJ";
        const r1 = await fetch(url1);
        console.log("TheNewsAPI Status:", r1.status);
    } catch(e) { console.error(e) }

    try {
        const url2 = "https://api.worldnewsapi.com/search-news?source-country=in&language=en&number=5&api-key=02f6b4d0da1e45768bf3d2704c710c5e";
        const r2 = await fetch(url2);
        console.log("WorldNewsAPI Status:", r2.status);
    } catch(e) { console.error(e) }
}
run();
