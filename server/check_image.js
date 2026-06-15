const axios = require('axios');

const urls = [
  "https://m.media-amazon.com/images/M/MV5BOGMwZGJiM2EtMzEwZC00YTYzLWIxNzYtMmJmZWNlZjgxZTMwXkEyXkFqcGc@._V1_.jpg", // Superman
  "https://m.media-amazon.com/images/M/MV5BM2E1ZTJiZTgtZGI2Zi00MzAxLThhZjktMmU3M2E3Yzk3NjUxXkEyXkFqcGc@._V1_.jpg", // Avengers
  "https://m.media-amazon.com/images/M/MV5BZDUxNThhYTUtYjgxNy00MGQ4LTgzOTEtZjg1YTU5NTcwNThlXkEyXkFqcGc@._V1_.jpg", // Moana 2
  "https://m.media-amazon.com/images/M/MV5BYjkwOWViYzYtMDQzNi00N2U0LWIxYTktNWE2ZDYyM2FhN2M5XkEyXkFqcGc@._V1_.jpg", // Spider-Man
  "https://m.media-amazon.com/images/M/MV5BOGM5MzA3MDAtYmEwMi00ZDNiLTg4MDgtMTZjOTc0ZGMyNTIwXkEyXkFqcGc@._V1_.jpg", // Fantastic Four
  "https://m.media-amazon.com/images/M/MV5BZDYxY2I1OGMtN2Y4MS00ZmU1LTgyNDAtODA0MzAyYjI0N2Y2XkEyXkFqcGc@._V1_.jpg", // Avatar
  "https://m.media-amazon.com/images/M/MV5BNjg2NTcwYWQtYzk4NS00MTJhLWEzZjItMzIxNjk3YzlkYzU0XkEyXkFqcGc@._V1_.jpg", // Jurassic World
  "https://m.media-amazon.com/images/M/MV5BOWMwYjYzYmMtMWQ2Ni00NWUwLTg2MzAtYzkzMDBiZDIwOTMwXkEyXkFqcGc@._V1_.jpg", // Wicked
  "https://m.media-amazon.com/images/M/MV5BMDlkYmJlNmEtMjg5NC00MTk2LThiOGYtYTAyZGI5ZGRjMDA2XkEyXkFqcGc@._V1_.jpg", // Batman Part II
  "https://m.media-amazon.com/images/M/MV5BYzFjMzNjOTktNDBlNy00YWZhLWExYTctZDcxNDA4OWVhOTJjXkEyXkFqcGc@._V1_.jpg"  // Minecraft Movie
];

(async () => {
  for (const url of urls) {
    try {
      const res = await axios.head(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(`✅ SUCCESS (${res.status}): ${url}`);
    } catch (err) {
      console.error(`❌ FAILED (${err.response ? err.response.status : err.message}): ${url}`);
    }
  }
  process.exit(0);
})();
