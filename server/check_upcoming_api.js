const axios = require('axios');

(async () => {
  try {
    const { data } = await axios.get('http://localhost:5000/api/v1/movies/upcoming');
    console.log('Upcoming API response first movie:', JSON.stringify(data.data.movies[0], null, 2));
    const { data: leavingData } = await axios.get('http://localhost:5000/api/v1/movies/leaving');
    console.log('Leaving API response first movie:', JSON.stringify(leavingData.data.movies[0], null, 2));
  } catch (err) {
    console.error('Error fetching API:', err.message);
  }
  process.exit(0);
})();
