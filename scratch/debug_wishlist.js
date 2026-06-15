const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });
const Wishlist = require('./server/src/models/Wishlist');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movie-rec-v2');
  const all = await Wishlist.find({});
  console.log('TOTAL WISHLIST ITEMS:', all.length);
  if (all.length > 0) {
    console.log('SAMPLE ITEM:', JSON.stringify(all[0], null, 2));
  }
  process.exit(0);
}
check();
