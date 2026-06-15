const connectDB = require('./src/config/db');
const mongoose = require('mongoose');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;
  const wishlistIndexes = await db.collection('wishlists').indexes();
  console.log('Wishlist Indexes:', JSON.stringify(wishlistIndexes, null, 2));
  process.exit(0);
})();
