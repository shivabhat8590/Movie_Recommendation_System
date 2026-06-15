const connectDB = require('./src/config/db');
const Wishlist = require('./src/models/Wishlist');
const User = require('./src/models/User');
const mongoose = require('mongoose');

(async () => {
  await connectDB();
  const user = await User.findOne({ email: 'admin@movieai.com' });
  if (!user) { console.log('Admin not found'); process.exit(1); }

  console.log('Adding 3 movies to wishlist for admin...');
  
  const movies = [
    { tmdbId: 101, title: 'Test 1' },
    { tmdbId: 102, title: 'Test 2' },
    { tmdbId: 103, title: 'Test 3' }
  ];

  for (const m of movies) {
    try {
      await Wishlist.create({ userId: user._id, ...m });
      console.log('Added:', m.title);
    } catch (e) {
      console.log('Failed:', m.title, e.message);
    }
  }

  const all = await Wishlist.find({ userId: user._id });
  console.log('Wishlist Count:', all.length);
  process.exit(0);
})();
