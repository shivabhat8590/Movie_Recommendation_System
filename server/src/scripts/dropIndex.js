const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_recommendation');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('movies');
    
    // List indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    // Find text index
    const textIndex = indexes.find(i => i.name.includes('_text'));
    if (textIndex) {
      console.log(`Dropping text index: ${textIndex.name}`);
      await collection.dropIndex(textIndex.name);
      console.log('Index dropped successfully');
    } else {
      console.log('No text index found to drop');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error dropping index:', err);
    process.exit(1);
  }
};

dropIndex();
