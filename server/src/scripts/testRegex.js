const https = require('https');

const query = 'Kung Fu Panda 2008 official trailer';
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
    console.log('VideoRenderer IDs:', ids);
    
    // Also log the very first videoId found by the old regex
    const oldMatch = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    console.log('Old regex first match:', oldMatch ? oldMatch[1] : null);
  });
});
