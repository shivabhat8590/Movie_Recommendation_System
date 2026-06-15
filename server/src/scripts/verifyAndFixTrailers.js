const fs = require('fs');
const https = require('https');
const path = require('path');

const dataPath = path.join(__dirname, '../data/mockMovies.json');
const movies = require(dataPath);

console.log(`Verifying and fixing trailers for ${movies.length} movies...`);

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

function fetchTrailerCandidates(title, year) {
  return new Promise((resolve) => {
    const query = `${title} ${year || ''} official trailer`;
    https.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const ids = [];
        const regex = /"videoRenderer":{"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          if (!ids.includes(match[1])) ids.push(match[1]);
          if (ids.length >= 8) break; // Get top 8 candidates
        }
        resolve(ids);
      });
    }).on('error', () => resolve([]));
  });
}

// Simple string similarity or inclusion check
function isTitleMatch(movieTitle, ytTitle) {
  if (!ytTitle) return false;
  const mt = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const yt = ytTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Clean up common trailer words
  const cleanMt = movieTitle.toLowerCase().replace(/the /g, '').replace(/:/g, '');
  const cleanYt = ytTitle.toLowerCase().replace(/trailer|official|teaser|hd|movie/g, '');
  
  // If the movie title is heavily included in the YT title
  const words = cleanMt.split(' ').filter(w => w.length > 2);
  let matchCount = 0;
  for (const w of words) {
    if (cleanYt.includes(w)) matchCount++;
  }
  
  // Need at least 50% word match if multiple words, or full match if 1 word
  if (words.length === 0) return true; // Edge case
  if (words.length === 1 && matchCount === 1) return true;
  if (matchCount >= Math.ceil(words.length / 2)) return true;
  
  return false;
}

async function run() {
  let updated = 0;
  let checked = 0;
  const batchSize = 3; // Smaller batch size due to more API calls
  
  // Find movies that need fixing. A movie needs fixing if its current trailer's title doesn't match the movie title
  // To avoid re-checking all 1000 every time, we check in real-time and only update if bad.
  
  for (let i = 0; i < movies.length; i += batchSize) {
    const batch = movies.slice(i, i + batchSize);
    process.stdout.write(`\rProcessing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(movies.length/batchSize)}... `);
    
    await Promise.all(batch.map(async (movie) => {
      // 1. Check current trailer
      const currentYtTitle = await getYTTitle(movie.trailerKey);
      const isCurrentValid = isTitleMatch(movie.title, currentYtTitle);
      
      if (!isCurrentValid) {
        // 2. Fetch candidates
        const candidates = await fetchTrailerCandidates(movie.title, movie.releaseYear);
        let foundNew = false;
        
        // 3. Find the first candidate that matches the title
        for (const cand of candidates) {
          const candTitle = await getYTTitle(cand);
          if (isTitleMatch(movie.title, candTitle)) {
            movie.trailerKey = cand;
            updated++;
            foundNew = true;
            console.log(`\nFixed "${movie.title}": New Trailer -> ${candTitle}`);
            break;
          }
        }
        
        if (!foundNew && candidates.length > 0) {
          // If no perfect match, just take the first candidate as fallback, it's probably better than the ad
          // Or we keep current? Let's take the first non-current candidate
          const fallback = candidates.find(c => c !== movie.trailerKey) || candidates[0];
          movie.trailerKey = fallback;
          updated++;
          console.log(`\nFallback "${movie.title}": No perfect match found. Using a candidate.`);
        }
      }
      checked++;
    }));
    
    // Save every batch so we don't lose progress if it fails
    if (updated > 0) {
      fs.writeFileSync(dataPath, JSON.stringify(movies, null, 2));
    }
    
    // Delay between batches
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\nSuccessfully checked ${checked} movies and fixed ${updated} trailers!`);
}

run();
