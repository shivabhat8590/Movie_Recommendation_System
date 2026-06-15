const axios = require('axios');
const cache = require('./cacheService');

const youtubeEnabled = !!process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'your_youtube_api_key_here';

const fetchTrailer = async (movieTitle, year) => {
  const cacheKey = `youtube:trailer:${encodeURIComponent(movieTitle)}:${year}`;
  const cached = await cache.get(cacheKey);
  if (cached !== null) return cached;

  if (!youtubeEnabled) {
    await cache.set(cacheKey, null, 86400 * 7);
    return null;
  }

  try {
    const query = `${movieTitle} ${year} official trailer`;
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'id,snippet',
        q: query,
        type: 'video',
        maxResults: 1,
        key: process.env.YOUTUBE_API_KEY,
      },
      timeout: 8000,
    });

    const videoId = data.items?.[0]?.id?.videoId || null;
    await cache.set(cacheKey, videoId, 86400 * 7);
    return videoId;
  } catch (err) {
    console.error('YouTube fetchTrailer error:', err.message);
    return null;
  }
};

module.exports = { fetchTrailer };
