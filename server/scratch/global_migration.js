const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_r');
  const db = mongoose.connection.db;
  
  const collections = ['wishlists', 'ratings', 'watchhistories', 'movies'];
  
  for (const collName of collections) {
    console.log(`\n--- CLEANING ${collName.toUpperCase()} ---`);
    const collection = db.collection(collName);
    const indexes = await collection.indexes();
    
    for (const idx of indexes) {
      const name = idx.name;
      // Skip standard indexes we want to keep
      if (name === '_id_' || name.includes('userId_1_tmdbId_1') || name.includes('tmdbId_1')) {
        continue;
      }
      
      // Drop any index that uses 'user' or 'movie' (the old field names)
      if (idx.key.user !== undefined || idx.key.movie !== undefined) {
        console.log(`  Dropping legacy index: ${name}`);
        try {
          await collection.dropIndex(name);
        } catch (e) { console.error(`  Failed to drop ${name}:`, e.message); }
      }
    }
  }

  console.log('\n✅ GLOBAL INDEX CLEANUP COMPLETE');
  process.exit(0);
}
migrate();
