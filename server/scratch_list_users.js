const mongoose = require('mongoose');

(async () => {
  await mongoose.connect('mongodb://localhost:27017/movie_r');
  const User = require('./src/models/User');
  const users = await User.find({}).lean();
  console.log('Users:');
  for (const u of users) {
    console.log(`- ${u.name} (${u.email}), role: ${u.role}, id: ${u._id}`);
  }
  process.exit(0);
})();
