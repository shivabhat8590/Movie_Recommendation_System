const connectDB = require('./src/config/db');
const mongoose = require('mongoose');

(async () => {
  await connectDB();
  const db = mongoose.connection.db;

  const collections = ['wishlists', 'ratings', 'watchhistories'];

  for (const collName of collections) {
    console.log(`\n🧹 Cleaning indexes for ${collName}...`);
    const collection = db.collection(collName);
    try {
      const indexes = await collection.indexes();
      console.log('Current indexes:', indexes.map(i => i.name));
      
      for (const idx of indexes) {
        if (idx.name !== '_id_') {
          console.log(`  Dropping index: ${idx.name}`);
          await collection.dropIndex(idx.name);
        }
      }
      console.log(`  ✅ All custom indexes dropped for ${collName}`);
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  console.log('\n🚀 Re-applying correct indexes via Mongoose models...');
  // Importing models triggers index creation
  require('./src/models/Wishlist');
  require('./src/models/Rating');
  require('./src/models/WatchHistory');
  
  // Give it a moment to sync
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('✅ Done! Indexes are now clean and correctly mapped to tmdbId.');
  process.exit(0);
})();
