const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATASET_URL = 'https://raw.githubusercontent.com/heig-vd-tweb/Teaching-TWEB-2018-Challenge/master/movies.json';

// High-Quality Pool with Trailers, Cast, and Detailed Metadata
const realMoviesPool = [
  {
    title: "Oppenheimer",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
    director: "Christopher Nolan",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr.", "Florence Pugh"],
    genres: ["Drama", "History"],
    trailerKey: "uYPbbksJxIg",
    posterPath: "/8GxvZruYvky9PjMUjDNygS3biMT.jpg",
    backdropPath: "/fm6NsRXY0YDznT3S7qr9asO4dbW.jpg",
    tmdbId: 872585,
    releaseYear: 2023,
    runtime: 180,
    budget: 100000000,
    revenue: 950000000,
    status: "Released",
    imdbRating: "8.4/10 (650,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Amazon Prime", link: "https://www.amazon.com/gp/video/detail/B0CG6K2X8C", type: "subscription" },
      { platform: "Apple TV", link: "https://tv.apple.com/movie/oppenheimer/umc.cmc.6n8v0p7v1v0v0v0v0v0v0v0v", type: "rent" }
    ]
  },
  {
    title: "The Dark Knight",
    overview: "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets. The partnership proves to be effective, but they soon find themselves prey to a reign of chaos unleashed by a rising criminal mastermind known to the terrified citizens of Gotham as the Joker.",
    director: "Christopher Nolan",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine", "Maggie Gyllenhaal"],
    genres: ["Action", "Crime", "Drama", "Thriller"],
    trailerKey: "EXeTwQWaywY",
    posterPath: "/qJ2tW6WMUDp9aqSbtmN9S7vNi46.jpg",
    backdropPath: "/nMK9S7vNi46wmUDp9aqSbtmN9S7vNi46.jpg",
    tmdbId: 155,
    releaseYear: 2008,
    runtime: 152,
    budget: 185000000,
    revenue: 1004558444,
    status: "Released",
    imdbRating: "9.0/10 (2,800,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Netflix", link: "https://www.netflix.com/title/70079583", type: "subscription" },
      { platform: "Amazon Prime", link: "https://www.amazon.com/Dark-Knight-Christian-Bale/dp/B001I1899O", type: "subscription" }
    ]
  },
  {
    title: "RRR",
    overview: "A fictional history of two legendary revolutionaries' journey away from home before they began fighting for their country in the 1920s.",
    director: "S.S. Rajamouli",
    cast: ["N.T. Rama Rao Jr.", "Ram Charan", "Ajay Devgn", "Alia Bhatt"],
    genres: ["Action", "Drama", "History"],
    trailerKey: "NgBoMJy386M",
    posterPath: "/nEu9fSrbT220mR8iU7T9YisXNcl.jpg",
    backdropPath: "/vOOn2r0t9KzI2ZIDZ2lH9uW09f5.jpg",
    tmdbId: 579974,
    releaseYear: 2022,
    runtime: 187,
    budget: 72000000,
    revenue: 160000000,
    status: "Released",
    imdbRating: "7.8/10 (160,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Netflix", link: "https://www.netflix.com/title/81476453", type: "subscription" },
      { platform: "Zee5", link: "https://www.zee5.com/movies/details/rrr/0-0-1z5123456", type: "subscription" }
    ]
  },
  {
    title: "Animal",
    overview: "A father-son bond carved in blood. The story follows a son's obsessive love for his father and the lengths he goes to protect him.",
    director: "Sandeep Reddy Vanga",
    cast: ["Ranbir Kapoor", "Anil Kapoor", "Rashmika Mandanna", "Bobby Deol"],
    genres: ["Action", "Drama", "Crime"],
    trailerKey: "8FkLRUJj-o0",
    posterPath: "/yS7oZ1s1tW5p2J2FmKkS2P2lM1p.jpg",
    backdropPath: "/t5zQ5J49R8j69Y26966f3P347y7.jpg",
    tmdbId: 781732,
    releaseYear: 2023,
    runtime: 201,
    budget: 12000000,
    revenue: 108000000,
    status: "Released",
    imdbRating: "6.3/10 (95,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Netflix", link: "https://www.netflix.com/title/81732644", type: "subscription" }
    ]
  },
  {
    title: "Inception",
    overview: "Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: \"inception\", the implantation of another person's idea into a target's subconscious.",
    director: "Christopher Nolan",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
    genres: ["Action", "Sci-Fi", "Adventure"],
    trailerKey: "YoHD9XEInc0",
    posterPath: "/9gk7Fn9sVAsS9Te6B1M1uOQTu4i.jpg",
    backdropPath: "/8Z99vYmda69uR6B9u796OobLc6.jpg",
    tmdbId: 27205,
    releaseYear: 2010,
    runtime: 148,
    budget: 160000000,
    revenue: 825532764,
    status: "Released",
    imdbRating: "8.8/10 (2,500,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Netflix", link: "https://www.netflix.com/title/70131314", type: "subscription" },
      { platform: "Amazon Prime", link: "https://www.amazon.com/Inception-Leonardo-DiCaprio/dp/B0047WJ11G", type: "subscription" }
    ]
  },
  {
    title: "Dune: Part Two",
    overview: "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.",
    director: "Denis Villeneuve",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson", "Javier Bardem"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    trailerKey: "Way9Dexny3w",
    posterPath: "/czembS0RhiERakSK7jSaeR3J5ER.jpg",
    backdropPath: "/xJHokMbljvjUzdq7LQ97S6yxpk8.jpg",
    tmdbId: 693134,
    releaseYear: 2024,
    runtime: 166,
    budget: 190000000,
    revenue: 711000000,
    status: "Released",
    imdbRating: "8.6/10 (450,000 votes) from imdb",
    streamingPlatforms: [
      { platform: "Amazon Prime", link: "https://www.amazon.com/Dune-Part-Two-Timothee-Chalamet/dp/B0CX9F5X1K", type: "rent" },
      { platform: "YouTube", link: "https://www.youtube.com/watch?v=Way9Dexny3w", type: "buy" }
    ]
  }
];

const generateMovies = async () => {
  console.log('📥 Fetching real-world movie dataset...');
  try {
    const response = await axios.get(DATASET_URL);
    const rawMovies = response.data;
    console.log(`✅ Fetched ${rawMovies.length} movies.`);

    const movies = [];
    const usedTmdbIds = new Set();

    // 1. Add High-Quality Pool First
    realMoviesPool.forEach(m => {
      movies.push({
        ...m,
        id: movies.length + 1,
        tmdbRating: m.tmdbRating || 8.5,
        voteCount: m.voteCount || 5000,
        popularity: m.popularity || 100,
        language: "en",
        originalLanguage: "en",
        country: "US",
        cast: m.cast.map((name, i) => ({ id: i, name, character: "Lead", profilePath: "" })),
        productionCompanies: (m.productionCompanies || ["Universal Pictures", "Warner Bros."]).map((name, i) => ({ id: i, name })),
        streamingPlatforms: [
          { platform: "Netflix", link: "https://netflix.com", type: "subscription" }
        ]
      });
      usedTmdbIds.add(m.tmdbId);
    });

    const directorsPool = ["Steven Spielberg", "Martin Scorsese", "Christopher Nolan", "Quentin Tarantino", "James Cameron", "Greta Gerwig", "S.S. Rajamouli", "Denis Villeneuve", "Ridley Scott", "David Fincher"];
    const actorsPool = ["Leonardo DiCaprio", "Tom Hanks", "Scarlett Johansson", "Robert Downey Jr.", "Meryl Streep", "Denzel Washington", "Shah Rukh Khan", "Zendaya", "Cillian Murphy", "Margot Robbie"];

    // Popular TMDB Trailer Map
    const trailerMap = {
      155: "EXeTwQWaywY", // Dark Knight
      297802: "2wcj6SrX4hs", // Aquaman
      299536: "6ZfuNTqbHE8", // Infinity War
      475557: "t433PEQGEW4", // Joker
      19995: "5PSNL1qE6VY", // Avatar
      597: "CHekzSiZqhY", // Titanic
      603: "vKQi3bBA1y8", // Matrix
      680: "s7EdQ4FqbhY", // Pulp Fiction
      550: "qtRKdVHc-cE", // Fight Club
      13: "bLvqoHBptjg", // Forrest Gump
      278: "6hB3S9bIaco", // Shawshank
      238: "sY1S34973zA", // Godfather
      634649: "JfVOs4VSpmA", // No Way Home
      414906: "mqqft2x_Aa4", // Batman
      284054: "xjDjIWPwcPU", // Black Panther
      297762: "1Q8fG0EzfAY", // Wonder Woman
      49521: "T6DJcgm3wNY", // Man of Steel
      141052: "3cxixDgszY4", // Justice League
      27205: "YoHD9XEInc0", // Inception
      157336: "zSWdZVtXT7E", // Interstellar
      603: "vKQi3bBA1y8", // Matrix
      120: "V75dMMIW2B4", // Lord of the Rings
      121: "LbfMDwc4azU", // LotR Two Towers
      122: "r5X-hFf6Bwo", // LotR Return of King
      27205: "YoHD9XEInc0", // Inception
      155: "EXeTwQWaywY", // Dark Knight
      872585: "uYPbbksJxIg", // Oppenheimer
      693134: "Way9Dexny3w", // Dune 2
      579974: "NgBoMJy386M", // RRR
      781732: "8FkLRUJj-o0", // Animal
      297802: "2wcj6SrX4hs", // Aquaman
      424783: "fAIX12F6958", // Bumblebee
      405774: "o2AsIXSh2xo", // Bird Box
      400650: "fK3S2Cf9zXU", // Mary Poppins Returns
      335983: "u9Mv98Gr5pY", // Venom
      504172: "N_QksLzvJW0", // The Mule
      450465: "w7uOhFTrM90", // Glass
      424694: "6S9c5nnKu_s", // Bohemian Rhapsody
      429197: "y9R-vK_x_Rk", // Vice
      438650: "vUQMre8n8UE", // Cold War
      452832: "fEsh6p-3f3g", // Serenity
      428078: "Z6m7s4w4Erxnr5k2jc1TZR1AMva", // Mortal Engines
      383498: "ByXuk9QqQMC", // Deadpool 2
      351286: "rt-2cxAiPJk", // Jurassic World
      363088: "Ym3LB0lOJ0Q", // Ant-Man
      299536: "TcMBFSGVi1c", // Infinity War
      284054: "xjDjIWPwcPU", // Black Panther
      284053: "u9Mv98Gr5pY", // Thor Ragnarok
      315635: "KDrqp0lP6pE", // Spider-Man Homecoming
      324857: "shW9i6k8cB0", // Spider-Verse
    };

    const realTrailersPool = [
      "uYPbbksJxIg", "EXeTwQWaywY", "NgBoMJy386M", "8FkLRUJj-o0", "YoHD9XEInc0", "Way9Dexny3w", "2wcj6SrX4hs",
      "JfVOs4VSpmA", "mqqft2x_Aa4", "xjDjIWPwcPU", "1Q8fG0EzfAY", "T6DJcgm3wNY", "3cxixDgszY4", "zSWdZVtXT7E",
      "6hB3S9bIaco", "sY1S34973zA", "bLvqoHBptjg", "TcMBFSGVi1c", "vM-Bja2Gy04", "h6hZkErfSsq", "KDrqp0lP6pE",
      "pU8-7BX9uxs", "A87Oa_rN774", "9BPMTr-sd9k", "gKizDojsdvs", "8hP9D6kZNYM", "M72zWw6vpQg", "vKQi3bBA1y8",
      "Z1BCujX3pw8", "shW9i6k8cB0", "r5X-hFf6Bwo", "ByXuk9QqQMC", "rt-2cxAiPJk", "Ym3LB0lOJ0Q", "XW2E26nZG1s",
      "w7uOhFTrM90", "Go8nHWscMTE", "47h6pQ6StDQ", "iszwuX1AK6A", "rBxcF-r9zbs", "8Qn_bis3l_w", "3PkkHsuMrho",
      "LbfMDwc4azU", "V75dMMIW2B4", "JfVOs4VSpmA", "u9Mv98Gr5pY", "Z6m7s4w4Erxnr5k2jc1TZR1AMva", "fEsh6p-3f3g"
    ];

    // 2. Process Raw Dataset
    rawMovies.forEach((m) => {
      if (usedTmdbIds.has(m.tmdb_id)) return;
      if (movies.length >= 1000) return;
      
      // ENSURE EVERY MOVIE HAS A POSTER AND BACKDROP
      if (!m.poster_path || !m.backdrop_path) return;

      let releaseYear = 2022;
      if (m.release_date) {
        const parts = m.release_date.split('-');
        releaseYear = parts[0] ? parseInt(parts[0]) : 2022;
      }
      
      const voteAvg = m.vote_average || 7.0;
      const votes = m.vote_count || Math.floor(Math.random() * 500000) + 10000;

      // Select trailer: specific map match > random from real pool
      const trailerKey = trailerMap[m.tmdb_id] || realTrailersPool[Math.floor(Math.random() * realTrailersPool.length)];

      movies.push({
        id: movies.length + 1,
        tmdbId: m.tmdb_id,
        title: m.title || "Unknown Movie",
        overview: m.overview || "No synopsis available for this film.",
        releaseYear: releaseYear || 2022,
        runtime: m.runtime || 120,
        genres: m.genres || ["Drama", "Feature"],
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        posterUrl: `https://image.tmdb.org/t/p/w500${m.poster_path}`,
        backdropUrl: `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`,
        tmdbRating: voteAvg,
        voteCount: votes,
        popularity: m.popularity || 50,
        language: "en", 
        originalLanguage: m.original_language || "en",
        country: "US",
        status: "Released",
        director: directorsPool[Math.floor(Math.random() * directorsPool.length)],
        budget: Math.floor(Math.random() * 150000000) + 20000000,
        revenue: Math.floor(Math.random() * 400000000) + 50000000,
        imdbRating: `${(voteAvg + 0.5).toFixed(1)}/10 (${votes.toLocaleString('en-US')} votes) from imdb`,
        rottenTomatoesRating: Math.floor(voteAvg * 10 + Math.random() * 5) + "%",
        metacriticRating: Math.floor(voteAvg * 9 + Math.random() * 5) + "/100",
        trailerKey: trailerKey, // Now guaranteed to be a real movie trailer!
        cast: [
          { id: 1, name: actorsPool[Math.floor(Math.random() * actorsPool.length)], character: "Lead", profilePath: "" },
          { id: 2, name: actorsPool[Math.floor(Math.random() * actorsPool.length)], character: "Supporting", profilePath: "" }
        ],
        productionCompanies: [
          { id: 1, name: "Warner Bros." },
          { id: 2, name: "Universal Pictures" }
        ].slice(0, Math.floor(Math.random() * 2) + 1),
        streamingPlatforms: [
          { platform: "Netflix", link: "https://netflix.com", type: "subscription" },
          { platform: "Amazon Prime", link: "https://primevideo.com", type: "subscription" },
          { platform: "Zee5", link: "https://zee5.com", type: "subscription" },
          { platform: "YouTube", link: "https://youtube.com", type: "buy" }
        ].slice(0, Math.floor(Math.random() * 3) + 1)
      });
      usedTmdbIds.add(m.tmdb_id);
    });

    const filePath = path.join(__dirname, '..', 'data', 'mockMovies.json');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(movies, null, 2));

    console.log(`\n✨ Successfully generated mockMovies.json with ${movies.length} PREMIUM movies!`);
  } catch (error) {
    console.error('❌ Failed to generate movies:', error.message);
  }
};

generateMovies();
