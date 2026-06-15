const fs = require('fs');
const path = require('path');
const axios = require('axios');

const filePath = path.resolve(__dirname, '../data/upcomingLeaving.json');

// Accurate TMDB IDs for upcoming and leaving movies
const ID_MAP = {
  "Superman": 1061474,
  "Avengers: Doomsday": 1003596,
  "Moana 2": 1241982,
  "Spider-Man: Beyond the Spider-Verse": 911916,
  "Fantastic Four: First Steps": 617126,
  "Avatar: Fire and Ash": 83533,
  "Jurassic World Rebirth": 1234821,
  "Wicked": 402431,
  "The Batman Part II": 414906, // Fallback to The Batman (2022) for official posters
  "A Minecraft Movie": 950387,
  "Inception": 27205,
  "The Dark Knight": 155,
  "Oppenheimer": 872585,
  "Animal": 781732,
  "Bumblebee": 424783
};

async function fetchTMDBImages(title) {
  const tmdbId = ID_MAP[title];
  if (!tmdbId) {
    console.log(`No TMDB ID mapped for "${title}"`);
    return null;
  }

  const url = `https://www.themoviedb.org/movie/${tmdbId}`;
  console.log(`Scraping TMDB page for "${title}" (${url})...`);

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    // Extract OpenGraph image
    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    // Also try checking for fallback backdrop/poster image patterns in HTML
    const backdropMatch = html.match(/"backdrop_path":"([^"]+)"/i);
    const posterMatch = html.match(/"poster_path":"([^"]+)"/i);

    let posterPath = '';
    let backdropPath = '';

    if (ogImageMatch && ogImageMatch[1]) {
      const ogUrl = ogImageMatch[1];
      console.log(`Found og:image URL: ${ogUrl}`);
      // Extract file name (e.g. /dfdvUzj4nLZpZ37BoefqvevCMI1.jpg)
      const parts = ogUrl.split('/');
      const filename = parts[parts.length - 1];
      posterPath = `/${filename}`;
    }

    if (posterMatch && posterMatch[1]) {
      posterPath = posterMatch[1].startsWith('/') ? posterMatch[1] : `/${posterMatch[1]}`;
    }

    if (backdropMatch && backdropMatch[1]) {
      backdropPath = backdropMatch[1].startsWith('/') ? backdropMatch[1] : `/${backdropMatch[1]}`;
    }

    // Default fallbacks if backdrop isn't found
    if (!backdropPath && posterPath) {
      backdropPath = posterPath;
    }

    if (posterPath) {
      console.log(`Successfully resolved images for "${title}": poster: ${posterPath}, backdrop: ${backdropPath}`);
      return { posterPath, backdropPath, tmdbId };
    }
  } catch (err) {
    console.error(`Failed to scrape images for "${title}":`, err.message);
  }

  return null;
}

async function run() {
  console.log('Starting scraper to fetch and verify high-fidelity TMDB poster paths...');
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  // Update Upcoming
  for (let i = 0; i < data.upcoming.length; i++) {
    const movie = data.upcoming[i];
    const result = await fetchTMDBImages(movie.title);
    if (result) {
      movie.tmdbId = result.tmdbId; // Update tmdbId to the correct ones!
      movie.posterPath = result.posterPath;
      movie.backdropPath = result.backdropPath;
    }
    await new Promise(r => setTimeout(r, 1500)); // Be polite to the server
  }

  // Update Leaving
  for (let i = 0; i < data.leaving.length; i++) {
    const movie = data.leaving[i];
    const result = await fetchTMDBImages(movie.title);
    if (result) {
      movie.tmdbId = result.tmdbId;
      movie.posterPath = result.posterPath;
      movie.backdropPath = result.backdropPath;
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Write updated data
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Successfully saved high-fidelity TMDB poster paths to upcomingLeaving.json!');
}

run();
