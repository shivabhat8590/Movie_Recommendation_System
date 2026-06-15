const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const activeGeminiKey = process.env.GEMINI_API_KEY;
const filePath = path.resolve(__dirname, '../data/upcomingLeaving.json');

async function getPathsFromGemini(title, year, id) {
  if (!activeGeminiKey || activeGeminiKey === 'your_gemini_api_key_here') {
    console.log('No Gemini key set, using fallback placeholders');
    return null;
  }

  const prompt = `You are a TMDB image asset query assistant. For the movie "${title}" released/releasing in ${year} (TMDB ID is likely ${id}), find the exact, official relative TMDB poster_path and backdrop_path.
For example, for "Moana 2", the official poster_path is "/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg".
For "Wicked", it is "/xOMo8BRK7PQt6vRA4hGfaYN2ri0.jpg" or "/d8Ruv2AEM4eV67R0C5VkcIE446Q.jpg".
Find the real TMDb relative path (starting with / and ending in .jpg). If you are not completely sure, provide the most plausible official TMDB file path based on your search/training data.
Return ONLY a valid JSON object matching this structure (no markdown formatting, no backticks, no extra text):
{
  "posterPath": "/example_poster.jpg",
  "backdropPath": "/example_backdrop.jpg"
}`;

  try {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.2
      }
    };

    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeGeminiKey}`,
      payload,
      { timeout: 15000 }
    );

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Clean markdown code blocks if any
    text = text.replace(/```json/i, '').replace(/```/g, '').trim();
    const result = JSON.parse(text);
    if (result.posterPath && result.backdropPath) {
      console.log(`Successfully fetched paths for "${title}":`, result);
      return result;
    }
  } catch (err) {
    console.error(`Error querying Gemini for "${title}":`, err.message);
  }
  return null;
}

async function run() {
  console.log('Starting upcomingLeaving.json poster update...');
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  // Update Upcoming
  for (let i = 0; i < data.upcoming.length; i++) {
    const movie = data.upcoming[i];
    console.log(`Processing upcoming: "${movie.title}" (${movie.releaseYear})...`);
    const paths = await getPathsFromGemini(movie.title, movie.releaseYear, movie.tmdbId);
    if (paths) {
      movie.posterPath = paths.posterPath;
      movie.backdropPath = paths.backdropPath;
    }
    // Rate limit precaution
    await new Promise(r => setTimeout(r, 1000));
  }

  // Update Leaving
  for (let i = 0; i < data.leaving.length; i++) {
    const movie = data.leaving[i];
    console.log(`Processing leaving: "${movie.title}" (${movie.releaseYear})...`);
    const paths = await getPathsFromGemini(movie.title, movie.releaseYear, movie.tmdbId);
    if (paths) {
      movie.posterPath = paths.posterPath;
      movie.backdropPath = paths.backdropPath;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log('Successfully wrote updated image paths to upcomingLeaving.json!');
}

run();
