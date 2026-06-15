const connectDB = require('../src/config/db');
const Movie = require('../src/models/Movie');

async function check() {
  await connectDB();
  const movies = await Movie.find({ title: { $in: [/Ralph/i, /Spider-Man: Into the Spider-Verse/i, /Mary Poppins Returns/i] } }).lean();
  movies.forEach(m => {
    console.log(`TITLE: ${m.title}`);
    console.log(`  POSTER: ${m.posterPath}`);
  });
  process.exit(0);
}

check();
