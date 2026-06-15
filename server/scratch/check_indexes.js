const mongoose = require('mongoose');
require('dotenv').config();
const Wishlist = require('../src/models/Wishlist');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_r');
  const collection = mongoose.connection.collection('wishlists');
  const indexes = await collection.indexes();
  console.log('INDEXES:', JSON.stringify(indexes, null, 2));
  process.exit(0);
}
check();
