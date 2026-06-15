const fs = require('fs');
const https = require('https');
const path = require('path');
const movies = require(path.join(__dirname, '../data/mockMovies.json'));

const panda = movies.find(m => m.title === 'Kung Fu Panda');

function fetchTrailerCandidates(title, year) {
  return new Promise((resolve) => {
    const query = `${title} ${year || ''} official trailer`;
    https.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const ids = [];
        const regex = /"videoRenderer":{"videoId":"([a-zA-Z0-9_-]{11})"/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          if (!ids.includes(match[1])) ids.push(match[1]);
          if (ids.length >= 3) break;
        }
        resolve(ids);
      });
    }).on('error', () => resolve([]));
  });
}

fetchTrailerCandidates('Kung Fu Panda', 2008).then(cands => {
  console.log('Kung Fu Panda Candidates:', cands);
  if (cands.length > 0) {
    panda.trailerKey = cands[0];
    fs.writeFileSync(path.join(__dirname, '../data/mockMovies.json'), JSON.stringify(movies, null, 2));
    console.log('Fixed Kung Fu Panda trailer to:', cands[0]);
  }
});
