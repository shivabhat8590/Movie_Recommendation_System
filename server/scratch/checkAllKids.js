const connectDB = require('../src/config/db');
const Movie = require('../src/models/Movie');

async function check() {
  await connectDB();
  const movies = await Movie.find({ 
    'genres.name': { $in: ['Animation', 'Family'] } 
  }).lean();
  
  movies.forEach(m => {
    console.log(`TITLE: ${m.title}`);
    console.log(`  POSTER: ${m.posterPath}`);
    console.log(`  GENRES: ${m.genres.map(g => g.name).join(', ')}`);
  });
  process.exit(0);
}

check();
