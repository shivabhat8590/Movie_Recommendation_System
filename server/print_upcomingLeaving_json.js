const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, './src/data/upcomingLeaving.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log('Upcoming list in file:', JSON.stringify(data.upcoming.map(m => ({ title: m.title, posterPath: m.posterPath })), null, 2));
process.exit(0);
