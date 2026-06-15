const https = require('https');

function fetchTrailer(query) {
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        resolve(match ? match[1] : null);
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const t = await fetchTrailer('Drive 2011 official trailer');
  console.log('Drive trailer:', t);
})();
