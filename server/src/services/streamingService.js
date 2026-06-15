const axios = require('axios');
const cache = require('./cacheService');

const streamingEnabled =
  !!process.env.STREAMING_API_KEY && process.env.STREAMING_API_KEY !== 'your_rapidapi_key_here';

// Simulated OTT platforms for demo/fallback
const MOCK_PLATFORMS = ['Netflix', 'Amazon Prime', 'Disney+ Hotstar', 'Apple TV+', 'Hulu'];

const getStreamingAvailability = async (tmdbId, country = 'in') => {
  const cacheKey = `streaming:${tmdbId}:${country}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  if (!streamingEnabled) {
    // Deterministic mock based on tmdbId
    const available = MOCK_PLATFORMS.filter((_, i) => (tmdbId + i) % 3 !== 0).slice(0, 2);
    const result = available.map((platform) => ({
      platform,
      link: `https://www.justwatch.com/in/search?q=${encodeURIComponent(platform)}`,
      type: 'subscription',
    }));
    await cache.set(cacheKey, result, 86400);
    return result;
  }

  try {
    const { data } = await axios.get('https://streaming-availability.p.rapidapi.com/v2/get/basic', {
      params: { country, tmdb_id: `movie/${tmdbId}` },
      headers: {
        'X-RapidAPI-Key': process.env.STREAMING_API_KEY,
        'X-RapidAPI-Host': process.env.STREAMING_API_HOST || 'streaming-availability.p.rapidapi.com',
      },
      timeout: 8000,
    });

    const platforms = Object.entries(data.result?.streamingInfo || {}).map(([platform, info]) => ({
      platform,
      link: info[0]?.link || '',
      type: info[0]?.type || 'subscription',
    }));

    await cache.set(cacheKey, platforms, 86400);
    return platforms;
  } catch (err) {
    console.error('Streaming availability error:', err.message);
    return [];
  }
};

module.exports = { getStreamingAvailability };
