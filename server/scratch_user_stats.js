const mongoose = require('mongoose');

(async () => {
  const conn = await mongoose.connect('mongodb://localhost:27017/movie_r');
  const db = conn.connection.db;

  const users = await db.collection('users').find().toArray();
  const watches = await db.collection('watchhistories').find().toArray();
  const ratings = await db.collection('ratings').find().toArray();
  const wishlists = await db.collection('wishlists').find().toArray();

  console.log('=== USERS ===');
  for (const u of users) {
    console.log(`User ID: ${u._id}, Name: ${u.name}, Email: ${u.email}`);
  }

  console.log('\n=== WATCH HISTORIES ===');
  for (const w of watches) {
    console.log(`User: ${w.userId}, Title: ${w.movieTitle}, tmdbId: ${w.tmdbId}, genres: ${JSON.stringify(w.genres)}, watchedAt: ${w.watchedAt}`);
  }

  console.log('\n=== RATINGS ===');
  for (const r of ratings) {
    console.log(`User: ${r.userId}, Title: ${r.movieTitle}, tmdbId: ${r.tmdbId}, score: ${r.score}, createdAt: ${r.createdAt}`);
  }

  console.log('\n=== WISHLISTS ===');
  for (const wi of wishlists) {
    console.log(`User: ${wi.userId}, Title: ${wi.title}, tmdbId: ${wi.tmdbId}, category: ${wi.category}, genres: ${JSON.stringify(wi.genres)}, addedAt: ${wi.addedAt}`);
  }

  process.exit(0);
})();
