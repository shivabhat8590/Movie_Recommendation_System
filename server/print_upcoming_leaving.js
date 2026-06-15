const fs = require('fs');
const path = require('path');
const filePath = path.resolve(__dirname, './src/data/upcomingLeaving.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
console.log('Upcoming leaving content:', JSON.stringify(data, null, 2));
process.exit(0);
