const fs = require('fs');
const https = require('https');
const path = require('path');
const movies = require(path.join(__dirname, '../data/mockMovies.json'));

const panda = movies.find(m => m.title === 'Kung Fu Panda');
console.log('Kung Fu Panda trailerKey:', panda.trailerKey);

function getYTTitle(videoId) {
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

getYTTitle(panda.trailerKey).then(t => console.log('YT Title:', t));
