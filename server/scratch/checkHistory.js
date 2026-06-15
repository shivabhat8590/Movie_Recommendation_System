const connectDB = require('../src/config/db');
const WatchHistory = require('../src/models/WatchHistory');
const Movie = require('../src/models/Movie');

async function check() {
  await connectDB();
  const history = await WatchHistory.find({}).lean();
  console.log('WATCH HISTORY RECORDS:', history);
  process.exit(0);
}

check();
