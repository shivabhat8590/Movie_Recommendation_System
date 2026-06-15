require('dotenv').config({ path: require('path').resolve(__dirname, '../..', '.env') });
const connectDB = require('../config/db');
const Movie = require('../models/Movie');
const mockMovies = require('../data/mockMovies.json');

async function run() {
  await connectDB();
  console.log('Connected to MongoDB. Syncing poster paths...');

  let updated = 0;
  for (const mockMovie of mockMovies) {
    const tmdbId = mockMovie.tmdbId || mockMovie.id;
    const newPoster = mockMovie.posterPath || mockMovie.poster_path || mockMovie.posterUrl;
    
    if (tmdbId && newPoster) {
      const result = await Movie.updateOne(
        { tmdbId },
        { $set: { posterPath: newPoster } }
      );
      if (result.modifiedCount > 0) {
        updated++;
      }
    }
  }

  console.log(`Successfully updated ${updated} movies in MongoDB with fresh poster paths!`);
  process.exit(0);
}

run();
