
// const url = 'https://api.anycrawl.dev/v1/search';
const url = 'http://web-server-anycrawl-uowofd-13a05c-152-53-171-95.traefik.me/v1/search';
const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ac-eeaa7846e47fd2b3fd968cc9feb98'
};
const data = {
    "query": "site:nanobanana.ai",
    "limit": 10,
    "engine": "google",
    "lang": "en-US",
    "offset": 0,
    // "scrape_options": {
    //     "engine": "cheerio"
    // }
};

fetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(data)
})
    .then(response => response.json())
    .then(result => console.log(result));