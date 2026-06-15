const mongoose = require('mongoose');
require('dotenv').config();
const Wishlist = require('../src/models/Wishlist');

async function check() {
  console.log('URI:', process.env.MONGO_URI);
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_r');
  const all = await Wishlist.find({});
  console.log('TOTAL WISHLIST ITEMS:', all.length);
  if (all.length > 0) {
    console.log('SAMPLE ITEM:', JSON.stringify(all[0], null, 2));
  }
  process.exit(0);
}
check();
