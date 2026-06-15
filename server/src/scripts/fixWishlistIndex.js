require('dotenv').config();
const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');

async function fixWishlistIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movieai');
    console.log('✅ Connected.');

    console.log('🗑 Dropping all indexes on Wishlist collection...');
    try {
      await Wishlist.collection.dropIndexes();
      console.log('✅ Old indexes dropped.');
    } catch (e) {
      console.log('⚠️ No indexes to drop or collection doesn\'t exist yet.');
    }

    console.log('🏗 Recreating correct unique index (userId + tmdbId)...');
    await Wishlist.collection.createIndex({ userId: 1, tmdbId: 1 }, { unique: true });
    console.log('✅ Correct index created.');

    console.log('\n✨ Wishlist index fix complete! You can now add multiple movies to your wishlist.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing index:', err);
    process.exit(1);
  }
}

fixWishlistIndex();
