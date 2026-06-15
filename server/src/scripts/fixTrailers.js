const fs = require('fs');
const https = require('https');
const path = require('path');

const dataPath = path.join(__dirname, '../data/mockMovies.json');
const movies = require(dataPath);

console.log(`Checking/updating trailers for ${movies.length} movies...`);

function checkTrailerValid(videoId) {
  if (!videoId || videoId === 'dQw4w9WgXcQ') return Promise.resolve(false);
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${videoId}&format=json`, (res) => {
      // Consume response to free up memory
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    }).on('error', () => resolve(false));
  });
}

function fetchTrailer(title, year) {
  return new Promise((resolve) => {
    const query = `${title} ${year || ''} official movie trailer`;
    https.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1]) {
          resolve(match[1]);
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  let updated = 0;
  let checked = 0;
  const batchSize = 5; // Small batch size for YouTube scraping to avoid rate limits
  
  // To avoid hitting YouTube too hard, let's just do a subset if it takes too long, 
  // but we'll try to do all of them.
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    process.stdout.write(`\rProcessing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(movies.length/batchSize)}... `);
    
    await Promise.all(batch.map(async (movie) => {
      const isValid = await checkTrailerValid(movie.trailerKey);
      if (!isValid) {
        const newKey = await fetchTrailer(movie.title, movie.releaseYear);
        if (newKey) {
          movie.trailerKey = newKey;
          updated++;
        }
      }
      checked++;
    }));
    
    // Save every batch so we don't lose progress if it fails
    if (updated > 0) {
      fs.writeFileSync(dataPath, JSON.stringify(movies, null, 2));
    }
    
    // Delay between batches
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\nSuccessfully checked ${checked} movies and updated ${updated} trailers!`);
}

run();
