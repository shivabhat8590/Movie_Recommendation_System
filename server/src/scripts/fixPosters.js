const fs = require('fs');
const https = require('https');

const path = require('path');
const dataPath = path.join(__dirname, '../data/mockMovies.json');
const movies = require(dataPath);

// Create a queue
const brokenMovies = movies.filter(m => 
  !m.posterUrl || 
  m.posterUrl.includes('image.tmdb.org') || 
  (m.posterPath && !m.posterPath.startsWith('http'))
);

console.log(`Checking/updating up to ${brokenMovies.length} movies...`);

function fetchImdbPoster(title, year) {
  return new Promise((resolve) => {
    // Format title for IMDB API: lowercase, spaces to underscores, remove special chars
    const query = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '_');
    if (!query) return resolve(null);
    
    const firstChar = query.charAt(0).match(/[a-z0-9]/) ? query.charAt(0) : 'a';
    const url = `https://v3.sg.media-imdb.com/suggestion/${firstChar}/${query}.json`;
    
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.d && json.d.length > 0) {
            // Try to find the closest match (movie, maybe matching year)
            let bestMatch = json.d.find(item => item.q === 'feature' && item.i && item.i.imageUrl);
            if (!bestMatch) {
                // Fallback to first item with an image
                bestMatch = json.d.find(item => item.i && item.i.imageUrl);
            }
            if (bestMatch) {
              resolve(bestMatch.i.imageUrl);
              return;
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  let updated = 0;
  const batchSize = 20; // To prevent rate limiting
  
  for (let i = 0; i < brokenMovies.length; i += batchSize) {
    const batch = brokenMovies.slice(i, i + batchSize);
    console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(brokenMovies.length/batchSize)}...`);
    
    await Promise.all(batch.map(async (movie) => {
      // Small optimization: only fetch if we confirmed it's 404, or just fetch for all to be safe?
      // Since almost all are fabricated, we just fetch for all of them
      const newUrl = await fetchImdbPoster(movie.title, movie.releaseYear);
      if (newUrl) {
        movie.posterUrl = newUrl;
        movie.posterPath = newUrl; // Make it an absolute URL so frontend/backend uses it directly
        // We could also do backdrop but IMDB suggestion only has posters. We'll leave backdrop alone or use poster for now.
        updated++;
      }
    }));
    
    // Slight delay between batches
    await new Promise(r => setTimeout(r, 500));
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(movies, null, 2));
  console.log(`Successfully updated ${updated} movie posters! Restarting the server is not needed for mock file changes if we just overwrite, but we might need to clear redis/cache if used. Wait, server uses nodemon, so it will restart automatically.`);
}

run();
