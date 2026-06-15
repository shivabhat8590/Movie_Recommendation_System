const fs = require('fs');
const https = require('https');
const path = require('path');

const dataPath = path.join(__dirname, '../data/mockMovies.json');
const movies = require(dataPath);

function getYTTitle(videoId) {
  if (!videoId || videoId === 'dQw4w9WgXcQ') return Promise.resolve(null);
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.title);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// Check first 20 movies as a sample
(async () => {
  console.log('Checking a sample of movies...');
  for (let i = 0; i < 20; i++) {
    const m = movies[i];
    const ytTitle = await getYTTitle(m.trailerKey);
    console.log(`Movie: "${m.title}" -> Trailer Title: "${ytTitle}" (ID: ${m.trailerKey})`);
  }
})();
