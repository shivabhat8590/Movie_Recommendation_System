const https = require('https');
const fs = require('fs');

function fetchTMDBHtml(tmdbId) {
  return new Promise((resolve) => {
    https.get(`https://www.themoviedb.org/movie/${tmdbId}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      // Follow redirects if needed
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(`https://www.themoviedb.org${res.headers.location}`, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }, (res2) => {
           let data = '';
           res2.on('data', chunk => data += chunk);
           res2.on('end', () => resolve(data));
        }).on('error', () => resolve(''));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function run() {
  const html1 = await fetchTMDBHtml(64690); // Drive
  fs.writeFileSync('drive_tmdb.html', html1);
  console.log('Saved to drive_tmdb.html');
}

run();
