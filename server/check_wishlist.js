const connectDB = require('./src/config/db');
const Wishlist = require('./src/models/Wishlist');
const mongoose = require('mongoose');

(async () => {
  await connectDB();
  const all = await Wishlist.find();
  console.log('Total Wishlist Items:', all.length);
  console.log('Sample Items:', JSON.stringify(all.slice(0, 5), null, 2));
  process.exit(0);
})();
