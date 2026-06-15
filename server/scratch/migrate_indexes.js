const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_r');
  const collection = mongoose.connection.collection('wishlists');
  
  console.log('DROPPING OLD INDEXES...');
  try {
    await collection.dropIndex('user_1_movie_1');
    console.log('Dropped user_1_movie_1');
  } catch (e) { console.log('Index user_1_movie_1 not found'); }
  
  try {
    await collection.dropIndex('user_1');
    console.log('Dropped user_1');
  } catch (e) { console.log('Index user_1 not found'); }
  
  // Also drop any other unique index that doesn't belong
  const indexes = await collection.indexes();
  for (const idx of indexes) {
    if (idx.name !== '_id_' && idx.name !== 'userId_1_tmdbId_1' && idx.name !== 'userId_1') {
      console.log('Found extra index:', idx.name);
      // await collection.dropIndex(idx.name);
    }
  }

  console.log('CLEANUP COMPLETE');
  process.exit(0);
}
migrate();
