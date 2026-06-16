const axios = require('axios');
const cache = require('./cacheService');
const path = require('path');
const dotenv = require('dotenv');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const openaiEnabled = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';


const openaiClient = openaiEnabled
  ? axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    })
  : null;

const geminiEnabled = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';

const generateRecommendationExplanation = async (userTopMovies, recommendedMovie) => {
  const cacheKey = `openai:explain:${recommendedMovie.tmdbId || recommendedMovie._id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  if (!openaiEnabled) {
    const explanation = `We recommend "${recommendedMovie.title}" because it aligns with your taste in ${
      userTopMovies.slice(0, 2).map((m) => m.title).join(' and ')
    }. It shares similar themes and has received excellent critical reviews.`;
    await cache.set(cacheKey, explanation, 86400);
    return explanation;
  }

  try {
    const prompt = `You are a movie recommendation AI. A user has watched and loved: ${userTopMovies.map((m) => m.title).join(', ')}. 
Explain in exactly 2 sentences why they would enjoy "${recommendedMovie.title}" (${recommendedMovie.releaseYear}, genres: ${recommendedMovie.genres?.map((g) => g.name).join(', ')}). 
Be specific, conversational, and enthusiastic.`;

    const { data } = await openaiClient.post('/chat/completions', {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.7,
    });

    const explanation = data.choices[0]?.message?.content?.trim() || 'You will love this movie!';
    await cache.set(cacheKey, explanation, 86400);
    return explanation;
  } catch (err) {
    console.error('OpenAI explanation error:', err.message);
    return `"${recommendedMovie.title}" matches your movie preferences perfectly based on genre and style similarity.`;
  }
};

const extractMovieSuggestions = (replyText, isKidsMode, isMovieChildSafe) => {
  const suggestions = [];
  const mockMovies = require('../data/mockMovies.json');
  
  // Try to find titles in double quotes or bold text
  const quotedMatches = replyText.match(/"([^"]+)"/g) || [];
  const boldMatches = replyText.match(/\*\*([^*"]+)\*\*/g) || [];
  
  const candidateTitles = new Set();
  
  quotedMatches.forEach(m => {
    candidateTitles.add(m.replace(/"/g, '').trim().toLowerCase());
  });
  
  boldMatches.forEach(m => {
    candidateTitles.add(m.replace(/\*/g, '').trim().toLowerCase());
  });

  // Extract from bulleted list patterns
  const lines = replyText.split('\n');
  lines.forEach(line => {
    const listMatch = line.match(/^[\s*-]*\d*\.?\s*\*\*([^*]+)\*\*/);
    if (listMatch) {
      candidateTitles.add(listMatch[1].trim().toLowerCase());
    }
  });

  // Map to mockMovies
  candidateTitles.forEach(titleClean => {
    if (!titleClean || titleClean.length < 2) return;
    if (['the', 'and', 'for', 'you', 'out', 'yes'].includes(titleClean)) return;

    const movie = mockMovies.find(m => {
      const mTitle = m.title.toLowerCase();
      return mTitle === titleClean || mTitle.includes(titleClean) || titleClean.includes(mTitle);
    });

    if (movie && suggestions.length < 3 && !suggestions.some(s => s.title === movie.title)) {
      if (!isKidsMode || isMovieChildSafe(movie)) {
        suggestions.push(movie);
      }
    }
  });

  // Fallback verbatim scan
  if (suggestions.length < 3) {
    const eligibleMovies = mockMovies.filter(m => !isKidsMode || isMovieChildSafe(m));
    for (const movie of eligibleMovies) {
      const mTitle = movie.title;
      if (mTitle.length < 4) continue;
      const regex = new RegExp(`\\b${mTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
      if (regex.test(replyText)) {
        if (!suggestions.some(s => s.title === movie.title)) {
          suggestions.push(movie);
          if (suggestions.length >= 3) break;
        }
      }
    }
  }

  return suggestions;
};

const chatbotResponse = async (messages, userPrefs = {}) => {
  // Dynamically load environment variables on every request to instantly apply any API key changes without a server restart
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });

  const activeGeminiKey = process.env.GEMINI_API_KEY;
  const isGeminiActive = !!activeGeminiKey && activeGeminiKey !== 'your_gemini_api_key_here';
  
  const activeOpenaiKey = process.env.OPENAI_API_KEY;
  const isOpenaiActive = !!activeOpenaiKey && activeOpenaiKey !== 'your_openai_api_key_here';

  const isKidsMode = !!userPrefs.kidsMode;

  let systemPrompt = '';
  if (isKidsMode) {
    systemPrompt = `You are KidsAI, a super fun, friendly, playful, and magical AI assistant for a kids' movie recommendation website! 🧸🎈
Your absolute priority is to help kids find fun, safe, and exciting movies (specifically Animation, Family, Fantasy, Comedy, and Adventure).
CRITICAL FILTERING RULES:
1. You MUST NEVER recommend or mention any adult, horror, thriller, or crime movies.
2. You MUST NOT show or recommend any adult filming, scary content, violence, jump scares, or R-rated/PG-13 mature content.
3. Keep your tone cheerful, encouraging, and filled with playful emojis!
4. You MUST EXCLUSIVELY recommend kid-friendly movies present in our database catalog. Do NOT suggest movies outside of this list under any circumstances!

Here are the available kid-friendly movies in our catalog:
1. "Mary Poppins Returns" (2018) - Fantasy/Family/Comedy (Cozy, Magical)
2. "Spider-Man: Into the Spider-Verse" (2018) - Animation/Action/Adventure (Top IMDb, Family Superhero)
3. "Ralph Breaks the Internet" (2018) - Animation/Comedy (Family, Fun Internet Adventures)
4. "The Lion King" (1994) - Animation/Family/Drama (Disney Classic)
5. "Toy Story" (1995) - Animation/Family/Comedy (Toys come to life!)
6. "Finding Nemo" (2003) - Animation/Family/Adventure (Underwater ocean search)
7. "Aladdin" (1992) - Animation/Fantasy/Family (Genie and magic carpet!)
8. "Bumblebee" (2018) - Sci-Fi/Action/Adventure (Friendly robot hero, PG action)
9. "Dora and the Lost City of Gold" (2019) - Adventure/Family/Comedy (Fun jungle exploration)

Respond with lots of emojis, keeping recommendations strictly safe for children under 10.`;
  } else {
    systemPrompt = `You are MovieAI, a friendly, engaging, conversational, and intelligent real-time AI assistant for a movie recommendation website.
Your job is to help users discover movies and TV shows based on: mood, genre, actor/director, language, IMDb rating, release year, trending movies, similar movies, user watch history, and favorite movies.

Website Info:
- Admin Email: admin@movieai.com
- Support Contact: support@movieai.com
- Main Features: Mood picker, wishlist, ratings, personal recommendation badges, real-time WebSocket chat.

CRITICAL CATALOG REQUIREMENT:
You MUST EXCLUSIVELY recommend movies that are present in our database catalog. Do NOT suggest movies outside of this list under any circumstances! 
Here are the main available movies in our catalog:
1. "Oppenheimer" (2023) - Drama/History (High IMDb, Emotional, Thriller)
2. "The Dark Knight" (2008) - Action/Crime/Thriller (Top IMDb, Mind-bending, Best Thriller)
3. "Inception" (2010) - Sci-Fi/Adventure (Mind-bending, Top IMDb)
4. "Dune: Part Two" (2024) - Sci-Fi/Adventure (Sci-Fi, Top IMDb)
5. "Interstellar" (2014) - Sci-Fi/Drama
6. "RRR" (2022) - Action/Drama (Inspiring, Action)
7. "Animal" (2023) - Action/Thriller/Crime (Best Thriller, Action)
8. "Aquaman" (2018) - Action/Fantasy/Adventure (Sci-Fi, Action)
9. "Bumblebee" (2018) - Sci-Fi/Action (Underrated Sci-Fi)
10. "Bird Box" (2018) - Thriller/Sci-Fi/Horror (Horror for friends, Thriller)
11. "Mary Poppins Returns" (2018) - Fantasy/Family/Comedy (Cozy, Family)
12. "Venom" (2018) - Action/Sci-Fi (Underrated Sci-Fi)
13. "The Mule" (2018) - Drama/Crime/Thriller (Thriller, Drama)
14. "Fantastic Beasts: The Crimes of Grindelwald" (2018) - Fantasy/Adventure
15. "Creed II" (2018) - Drama/Sport (Emotional)
16. "Spider-Man: Into the Spider-Verse" (2018) - Animation/Action (Top IMDb, Family)
17. "Ralph Breaks the Internet" (2018) - Animation/Comedy (Family, Cozy)
18. "Avengers: Infinity War" (2018) - Action/Sci-Fi (Sci-Fi, Action)
19. "Bohemian Rhapsody" (2018) - Drama/Music (Emotional, Top IMDb)
20. "Dragon Ball Super: Broly" (2018) - Animation/Action
21. "Every Day" (2018) - Romance/Fantasy (Emotional)
22. "Juliet, Naked" (2018) - Comedy/Drama
23. "Thuppakki Munai" (2018) - Action/Thriller
24. "Life Is Beautiful" (1997) - Drama/Romance (Top IMDb, Emotional)
25. "Beautiful Boy" (2018) - Drama/Biography (Emotional, Drama)
26. "Replicas" (2018) - Sci-Fi/Thriller (Underrated Sci-Fi, Mind-bending)
27. "Mortal Engines" (2018) - Sci-Fi/Adventure (Underrated Sci-Fi)
28. "Halloween" (2018) - Horror/Thriller (Horror for friends)
29. "The Nun" (2018) - Horror/Mystery (Horror for friends)
30. "Goosebumps 2: Haunted Halloween" (2018) - Horror/Comedy/Family (Horror for friends)
31. "Infected" (2018) - Horror/Thriller (Horror for friends)

Behavior Rules:
1. Be friendly, engaging, and conversational. Keep responses short but informative.
2. Recommend movies using this exact format for suggestions: "Title" (Release Year) - Genre: ... - IMDb: ... - Storyline: ...
3. Always put recommended movie titles in quotes (e.g. "Inception") so they can be processed by our system.
4. Suggest similar movies from the catalog when possible.
5. Understand custom mood messages like "Best thriller movies", "Mind-bending movies", "Emotional movies", "Horror movies for friends", "Top IMDb movies", or "Underrated sci-fi films".
6. If the user is unsure, ask friendly follow-up questions.
7. Recommend only relevant movies from our catalog list and never repeat recommendations frequently.
8. If a movie is unavailable, suggest alternatives from our catalog list.

Extra Features to Support:
- Recommend trending movies from our list (e.g. "Dune: Part Two", "Oppenheimer", "Animal").
- Recommend based on specific requested moods: Best thriller ("The Dark Knight", "Animal", "Bird Box"), Mind-bending ("Inception", "The Dark Knight", "Replicas"), Emotional ("Life Is Beautiful", "Beautiful Boy", "Every Day"), Horror for friends ("Bird Box", "The Nun", "Halloween", "Goosebumps 2"), Top IMDb ("The Dark Knight", "Inception", "Oppenheimer", "Spider-Man: Into the Spider-Verse", "Life Is Beautiful"), Underrated sci-fi ("Replicas", "Mortal Engines", "Bumblebee", "Venom").
- Support multilingual movie recommendations.
- Provide streaming platform suggestions if available.
- Suggest trailers when asked.

Always keep responses natural, human-like, and real-time.`;
  }

  // Helper function to check if a movie is child safe
  const isMovieChildSafe = (movie) => {
    if (!movie) return false;
    const genres = movie.genres || [];
    const hasMatureGenre = genres.some(g => {
      const name = typeof g === 'string' ? g : g?.name;
      return ['Horror', 'Thriller', 'Crime'].includes(name);
    });
    return !movie.adult && !hasMatureGenre;
  };

  // --- 1. Try Google Gemini API (Free Tier) ---
  if (isGeminiActive) {
    try {
      const historyText = messages.map(m => `${m.role === 'assistant' ? 'model' : 'user'}: ${m.content}`).join('\n');
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Question and Conversation History:\n${historyText}` }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7
        }
      };

      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeGeminiKey}`,
        payload,
        { timeout: 15000 }
      );

      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'd love to help you find a great movie!";
      
      const suggestions = extractMovieSuggestions(replyText, isKidsMode, isMovieChildSafe);

      return {
        content: replyText,
        movieSuggestions: suggestions
      };
    } catch (err) {
      console.error('Gemini Chatbot API error:', err.response?.data || err.message);
    }
  }

  // --- 2. Try OpenAI API ---
  if (isOpenaiActive) {
    try {
      const dynamicOpenaiClient = axios.create({
        baseURL: 'https://api.openai.com/v1',
        headers: { Authorization: `Bearer ${activeOpenaiKey}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const { data } = await dynamicOpenaiClient.post('/chat/completions', {
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 2048,
        temperature: 0.8,
      });

      const replyText = data.choices[0]?.message?.content?.trim() || "I'd love to help you find a great movie!";
      
      const suggestions = extractMovieSuggestions(replyText, isKidsMode, isMovieChildSafe);

      return {
        content: replyText,
        movieSuggestions: suggestions,
      };
    } catch (err) {
      console.error('OpenAI chatbot error:', err.message);
    }
  }

  // --- 3. Kids Mode Mock Local Responder fallback ---
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
  const mockMovies = require('../data/mockMovies.json');

  if (isKidsMode) {
    // Filter to ONLY safe kid movies
    const safeKidMovies = mockMovies.filter(isMovieChildSafe);

    const happyKidsList = safeKidMovies.filter(m => ['Mary Poppins Returns', 'Spider-Man: Into the Spider-Verse', 'Ralph Breaks the Internet'].includes(m.title));
    const adventureKidsList = safeKidMovies.filter(m => ['Bumblebee', 'Spider-Man: Into the Spider-Verse'].includes(m.title));

    if (lastMessage.includes('thriller') || lastMessage.includes('horror') || lastMessage.includes('scary') || lastMessage.includes('adult') || lastMessage.includes('crime') || lastMessage.includes('filming')) {
      return {
        content: `🎈 Oh, those movies are a bit too scary or mature for our Kids Playground! 👶 But don't worry, I have some super-fun, exciting superhero adventures and magical comedies that you will absolutely love! How about we watch a friendly robot hero or a magical nanny? 🧸🍿`,
        movieSuggestions: happyKidsList.slice(0, 3)
      };
    }

    if (lastMessage.includes('adventure') || lastMessage.includes('hero') || lastMessage.includes('robot') || lastMessage.includes('scifi') || lastMessage.includes('sci-fi')) {
      return {
        content: `🛸 **Super Fun Sci-Fi & Adventure!** 🚀\nGet ready for action-packed but totally safe adventures! These movies feature brave heroes, cool science, and lots of laughs:\n\n1. "Spider-Man: Into the Spider-Verse" (2018) - The coolest animated superhero movie ever!\n2. "Bumblebee" (2018) - A friendly yellow transformer robot who protects his friends!`,
        movieSuggestions: adventureKidsList.slice(0, 2)
      };
    }

    // Default response for Kids Mode Chatbot
    return {
      content: `🎬 **Welcome to the KidsAI Chat!** 🧸🍿\nTell me what you feel like watching! I can recommend some magical movies, animated favorites, or exciting superhero tales. Everything here is 100% safe and fun! Check out these amazing picks:\n\n1. "Mary Poppins Returns" (2018) - Full of magic and musical joy!\n2. "Spider-Man: Into the Spider-Verse" (2018) - Action-packed animation adventure!\n3. "Ralph Breaks the Internet" (2018) - Super funny internet journey!`,
      movieSuggestions: happyKidsList.slice(0, 3)
    };
  }

  // --- 4. Standard Mock Local Responder fallback ---
  // 1. Specific movie query (whole-word boundary check to avoid false matches on small words like 'It')
  const mentionedMovie = mockMovies.find(m => {
    const titleClean = m.title.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(titleClean)}\\b`, 'i');
    return regex.test(lastMessage);
  });
  if (mentionedMovie) {
    if (lastMessage.includes('director') || lastMessage.includes('direct') || lastMessage.includes('who made')) {
      return {
        content: `🎬 "${mentionedMovie.title}" (${mentionedMovie.releaseYear}) was directed by the master ${mentionedMovie.director || 'talented director'}. It has an IMDb rating of ${mentionedMovie.imdbRating || 'N/A'}.`,
        movieSuggestions: [mentionedMovie]
      };
    }
    if (lastMessage.includes('cast') || lastMessage.includes('actor') || lastMessage.includes('star') || lastMessage.includes('play')) {
      const stars = mentionedMovie.cast?.slice(0, 3).map(c => c.name).join(', ') || 'an amazing cast';
      return {
        content: `🌟 "${mentionedMovie.title}" stars ${stars}. Storyline: ${mentionedMovie.overview || 'No synopsis available.'}`,
        movieSuggestions: [mentionedMovie]
      };
    }
    if (lastMessage.includes('platform') || lastMessage.includes('where to watch') || lastMessage.includes('stream') || lastMessage.includes('netflix') || lastMessage.includes('prime')) {
      const platforms = mentionedMovie.streamingPlatforms?.map(p => p.platform).join(', ') || 'Netflix';
      return {
        content: `📱 You can stream "${mentionedMovie.title}" on: ${platforms}. Let me know if you need similar movies!`,
        movieSuggestions: [mentionedMovie]
      };
    }
    if (lastMessage.includes('trailer') || lastMessage.includes('youtube') || lastMessage.includes('video')) {
      return {
        content: `🎥 Here is the trailer info for "${mentionedMovie.title}"! You can watch it directly on the card below or click to play it instantly.`,
        movieSuggestions: [mentionedMovie]
      };
    }
    return {
      content: `🍿 "${mentionedMovie.title}" (${mentionedMovie.releaseYear}) - Genre: ${mentionedMovie.genres?.join(', ') || 'Drama'} - IMDb: ${mentionedMovie.imdbRating || '8.5/10'} - Storyline: ${mentionedMovie.overview || 'No synopsis available.'}`,
      movieSuggestions: [mentionedMovie]
    };
  }

  // 2. Custom mood recommendations logic (dynamic constraints strictly using local mockMovies)
  if (lastMessage.includes('mind-bending') || lastMessage.includes('mindblowing') || lastMessage.includes('twist')) {
    const blowMovies = mockMovies.filter(m => ['Inception', 'The Dark Knight', 'Oppenheimer', 'Replicas'].includes(m.title));
    return {
      content: `🤯 **Mind-Bending Masterpieces**\nPrepare to have your perception of reality challenged, dreams hijacked, and secrets unveiled. These exceptional mind-bending cinema triumphs from our catalog will leave you absolutely speechless:\n\n1. "Inception" (2010) - IMDb: 8.8 - The definitive subconscious dream heist masterpiece.\n2. "The Dark Knight" (2008) - IMDb: 9.0 - A dark psychological duel of order vs chaos.\n3. "Oppenheimer" (2023) - IMDb: 8.4 - A monumental look inside a brilliant, fractured mind.\n4. "Replicas" (2018) - IMDb: 6.5 - A tense, neuroscience sci-fi thriller about defying death.`,
      movieSuggestions: blowMovies.slice(0, 3)
    };
  }

  if (lastMessage.includes('underrated sci-fi') || lastMessage.includes('underrated scifi') || lastMessage.includes('underrated science fiction')) {
    const sciFiMovies = mockMovies.filter(m => ['Replicas', 'Mortal Engines', 'Bumblebee', 'Venom'].includes(m.title));
    return {
      content: `🛸 **Underrated Sci-Fi Gems**\nLooking for incredible science fiction that didn't get enough mainstream limelight? These fantastic underrated catalog sci-fi titles deserve a high spot on your watchlist:\n\n1. "Replicas" (2018) - IMDb: 6.5 - A chilling clone thriller where neuroscience crosses ethical boundaries.\n2. "Mortal Engines" (2018) - IMDb: 6.1 - A visually spectacular post-apocalyptic traction city epic.\n3. "Bumblebee" (2018) - IMDb: 7.0 - A touching, retro-styled adventure packed with heart and classic action.\n4. "Venom" (2018) - IMDb: 7.0 - A thrilling, high-energy symbiote ride with an unmatched anti-hero dynamic.`,
      movieSuggestions: sciFiMovies.slice(0, 3)
    };
  }

  if (lastMessage.includes('thriller') || lastMessage.includes('suspense') || lastMessage.includes('crime')) {
    const thrillerMovies = mockMovies.filter(m => ['The Dark Knight', 'Animal', 'Bird Box', 'The Mule'].includes(m.title));
    return {
      content: `⛓️ **Best Thriller Movies**\nCraving high stakes, relentless suspense, and adrenaline-pumping crime dramas? These top thrillers from our catalog represent absolute peak intensity:\n\n1. "The Dark Knight" (2008) - IMDb: 9.0 - The ultimate crime saga of Order vs Chaos.\n2. "Animal" (2023) - IMDb: 6.3 - A ferocious, high-intensity family crime drama.\n3. "Bird Box" (2018) - IMDb: 6.6 - A post-apocalyptic blindfolded survival thriller.\n4. "The Mule" (2018) - IMDb: 7.0 - Clint Eastwood's gripping tale of an elderly drug courier.`,
      movieSuggestions: thrillerMovies.slice(0, 3)
    };
  }

  if (lastMessage.includes('horror') || lastMessage.includes('scary') || lastMessage.includes('creepy') || lastMessage.includes('friend')) {
    const horrorMovies = mockMovies.filter(m => ['Bird Box', 'Halloween', 'The Nun', 'Goosebumps 2: Haunted Halloween'].includes(m.title));
    return {
      content: `🧟 **Horror Movies for Friends**\nGather your friends, turn off the lights, and grab the popcorn. These spooky and terrifying catalog thrillers are perfect for group jump scares:\n\n1. "Bird Box" (2018) - IMDb: 6.6 - The blindfolded horror phenomenon.\n2. "Halloween" (2018) - IMDb: 6.5 - Michael Myers returns in this legacy sequel.\n3. "The Nun" (2018) - IMDb: 5.3 - A dark gothic horror mystery set inside a haunted abbey.\n4. "Goosebumps 2: Haunted Halloween" (2018) - IMDb: 5.6 - A playful, creepy Halloween adventure.`,
      movieSuggestions: horrorMovies.slice(0, 3)
    };
  }

  if (lastMessage.includes('emotional') || lastMessage.includes('sad') || lastMessage.includes('cry') || lastMessage.includes('tear')) {
    const emotional = mockMovies.filter(m => ['Life Is Beautiful', 'Beautiful Boy', 'Every Day', 'Creed II'].includes(m.title));
    return {
      content: `🎭 **Deeply Emotional Movies**\nPrepare yourself for powerful stories filled with deep emotions, tears, hope, and humanity. Here are the most touching, heart-wrenching films in our catalog:\n\n1. "Life Is Beautiful" (1997) - IMDb: 8.4 - A legendary, heartwarming, and tragic tale of a father protecting his son.\n2. "Beautiful Boy" (2018) - IMDb: 7.3 - A raw, moving biographical drama exploring family bonds and recovery.\n3. "Every Day" (2018) - IMDb: 6.4 - A poetic romance about loving a soul who wakes up in a different body every day.\n4. "Creed II" (2018) - IMDb: 7.1 - An intensely emotional sports drama about legacy, family, and rising again.`,
      movieSuggestions: emotional.slice(0, 3)
    };
  }

  if (lastMessage.includes('rainy day') || lastMessage.includes('cozy') || lastMessage.includes('comfort')) {
    const cozyMovies = mockMovies.filter(m => ['Mary Poppins Returns', 'Ralph Breaks the Internet', 'RRR'].includes(m.title));
    return {
      content: `🌧️ For a cozy rainy day, I highly recommend watching these emotional and comforting films from our catalog:\n\n1. "Mary Poppins Returns" (2018) - IMDb: 7.4 - Pure musical magic and joy to light up your room.\n2. "Ralph Breaks the Internet" (2018) - IMDb: 7.0 - A funny, creative internet family adventure.\n3. "RRR" (2022) - IMDb: 7.8 - A high-spirited, spectacular action drama about friendship and brotherhood.`,
      movieSuggestions: cozyMovies.slice(0, 3)
    };
  }

  if (lastMessage.includes('happy') || lastMessage.includes('funny') || lastMessage.includes('laugh') || lastMessage.includes('motivational') || lastMessage.includes('inspire')) {
    const happyMovies = mockMovies.filter(m => ['Mary Poppins Returns', 'RRR', 'Bumblebee'].includes(m.title));
    return {
      content: `🌈 Let's boost your mood! Here are highly motivational, happy, and spectacular watches from our database:\n\n1. "RRR" (2022) - IMDb: 7.8 - An absolutely electric, inspiring bond of friendship and action.\n2. "Bumblebee" (2018) - IMDb: 7.0 - A heartwarming sci-fi adventure filled with nostalgia.\n3. "Mary Poppins Returns" (2018) - IMDb: 7.4 - Pure musical magic and joy to light up your night!`,
      movieSuggestions: happyMovies.slice(0, 3)
    };
  }

  // 3. Similar movie queries
  if (lastMessage.includes('like interstellar') || lastMessage.includes('like inception') || lastMessage.includes('like dune')) {
    const simMovies = mockMovies.filter(m => ['Inception', 'Oppenheimer', 'Dune: Part Two'].includes(m.title));
    return {
      content: `🚀 Love mind-bending space & sci-fi like Interstellar? You will absolutely adore these titles present in our catalog:\n\n1. "Inception" (2010) - IMDb: 8.8 - Nolan's famous dream heist.\n2. "Dune: Part Two" (2024) - IMDb: 8.6 - An epic, visually breath-taking sci-fi masterpiece.\n3. "Oppenheimer" (2023) - IMDb: 8.4 - Another Nolan film filled with intense sound design and scale.`,
      movieSuggestions: simMovies.slice(0, 3)
    };
  }

  // 4. Trending query
  if (lastMessage.includes('trending') || lastMessage.includes('popular') || lastMessage.includes('now')) {
    const trendingMovies = mockMovies.filter(m => ['Dune: Part Two', 'Oppenheimer', 'Animal'].includes(m.title));
    return {
      content: `🔥 Here are the hottest, most popular trending movies on our site right now:\n\n1. "Dune: Part Two" (2024) - IMDb: 8.6 - The blockbuster sci-fi epic.\n2. "Oppenheimer" (2023) - IMDb: 8.4 - Nolan's historical triumph.\n3. "Animal" (2023) - IMDb: 6.3 - A dark, high-octane action drama.`,
      movieSuggestions: trendingMovies.slice(0, 3)
    };
  }

  // 5. Genre matching
  let genreId = null;
  let genreName = '';
  
  if (lastMessage.includes('action')) { genreId = 28; genreName = 'Action'; }
  else if (lastMessage.includes('adventure')) { genreId = 12; genreName = 'Adventure'; }
  else if (lastMessage.includes('animation')) { genreId = 16; genreName = 'Animation'; }
  else if (lastMessage.includes('comedy')) { genreId = 35; genreName = 'Comedy'; }
  else if (lastMessage.includes('crime')) { genreId = 80; genreName = 'Crime'; }
  else if (lastMessage.includes('documentary')) { genreId = 99; genreName = 'Documentary'; }
  else if (lastMessage.includes('drama')) { genreId = 18; genreName = 'Drama'; }
  else if (lastMessage.includes('family')) { genreId = 10751; genreName = 'Family'; }
  else if (lastMessage.includes('fantasy')) { genreId = 14; genreName = 'Fantasy'; }
  else if (lastMessage.includes('history')) { genreId = 36; genreName = 'History'; }
  else if (lastMessage.includes('horror') || lastMessage.includes('scary')) { genreId = 27; genreName = 'Horror'; }
  else if (lastMessage.includes('music')) { genreId = 10402; genreName = 'Music'; }
  else if (lastMessage.includes('mystery')) { genreId = 9648; genreName = 'Mystery'; }
  else if (lastMessage.includes('romance') || lastMessage.includes('romantic')) { genreId = 10749; genreName = 'Romance'; }
  else if (lastMessage.includes('sci-fi') || lastMessage.includes('science fiction')) { genreId = 878; genreName = 'Science Fiction'; }
  else if (lastMessage.includes('thriller')) { genreId = 53; genreName = 'Thriller'; }
  else if (lastMessage.includes('war')) { genreId = 10752; genreName = 'War'; }
  else if (lastMessage.includes('western')) { genreId = 37; genreName = 'Western'; }

  if (genreId) {
    const tmdb = require('./tmdbService');
    try {
      const { movies } = await tmdb.getMoviesByGenre(genreId);
      const suggestions = movies.slice(0, 3);
      if (suggestions.length > 0) {
        const formatted = suggestions.map((m, i) => `${i + 1}. "${m.title}" (${m.releaseYear}) - IMDb: ${m.imdbRating || '8.0'} - Storyline: ${m.overview?.slice(0, 100)}...`).join('\n');
        return {
          content: `Sure! I found some great ${genreName} movies in our catalog:\n${formatted}\n\nEnjoy watching! Let me know if you would like platform links or trailers!`,
          movieSuggestions: suggestions,
        };
      }
    } catch (err) {
      console.error('Mock genre recommend error:', err);
    }
  }
  
  // 6. Keyword search fallback
  const words = lastMessage.split(' ');
  const searchKeywords = words.filter(w => w.length > 4 && !['recommend', 'suggest', 'movies', 'films', 'watch', 'about', 'there', 'please', 'would'].includes(w));
  if (searchKeywords.length > 0) {
    const tmdb = require('./tmdbService');
    try {
      const { movies } = await tmdb.searchMovies(searchKeywords[0]);
      const suggestions = movies.slice(0, 3);
      if (suggestions.length > 0) {
        const formatted = suggestions.map((m, i) => `${i + 1}. "${m.title}" (${m.releaseYear}) - IMDb: ${m.imdbRating || '8.0'} - Storyline: ${m.overview?.slice(0, 100)}...`).join('\n');
        return {
          content: `🔍 I searched the catalog for movies related to "${searchKeywords[0]}" and found: \n${formatted}`,
          movieSuggestions: suggestions,
        };
      }
    } catch (err) {
      console.error('Mock keyword search error:', err);
    }
  }

  return {
    content: "👋 Hi! I'm MovieAI, your intelligent real-time movie recommendation assistant! 🍿\n\nI recommend ONLY movies that are actively present in our movie catalog! Try one of the quick mood filters above (like Thrillers, Mind-Bending, or Underrated Sci-Fi) or tell me what you're in the mood for!",
    movieSuggestions: [],
  };
};

const generateUserActivityInsights = async (userData, summaryData, weeklyData, genreData) => {
  const cacheKey = `gemini:insights:${userData._id}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const activeGeminiKey = process.env.GEMINI_API_KEY;
  const isGeminiActive = !!activeGeminiKey && activeGeminiKey !== 'your_gemini_api_key_here';

  const formatString = `User name: ${userData.name}
Total Movies Viewed: ${summaryData.totalViews}
Total Movie Clicks: ${summaryData.totalClicks}
Total Watchlist Additions: ${summaryData.totalWatchlistAdds}
Total Ratings Submitted: ${summaryData.totalRatings}
Total Reviews Posted: ${summaryData.totalReviews}
Total AI Chatbot Interactions: ${summaryData.totalChatbot}
Most Watched Genre: ${summaryData.mostWatchedGenre}
Most Viewed Movie: ${summaryData.mostViewedMovie}
Weekly Engagement (last 7 days counts): ${JSON.stringify(weeklyData)}
Top Genres: ${JSON.stringify(genreData.topGenres)}
Genre Distribution: ${JSON.stringify(genreData.distribution)}`;

  const prompt = `You are MovieAI Analytics, a cinematic behavioral analyst. Analyze the following movie streaming service user activity metrics and write a short, highly personalized, premium analysis (3-4 sentences, approximately 100-150 words) detailing:
1. The user's viewing behavior (e.g. active vs passive, rate of watching).
2. Genre preferences and recommendation patterns (what kind of content they are drawn to and what we should suggest next).
3. Engagement level and user activity trends (e.g. peak activity times, chatbot reliance, review posting behavior).

Be professional, encouraging, and clear. Format the response as a single cohesive paragraph. Do not use generic markdown placeholders.

User Metrics:
${formatString}`;

  // Default fallback text if Gemini is not available
  const defaultInsights = `Based on our analytics, ${userData.name} is an active member who primarily enjoys ${summaryData.mostWatchedGenre || 'a diverse selection of'} movies. Their high volume of movie views and ratings suggests a highly engaged, hands-on viewing behavior, while their chatbot queries show a strong reliance on AI recommendations to discover new cinema. We recommend tailoring their home feed to prioritize ${summaryData.mostWatchedGenre || 'their favorite'} titles and upcoming releases to maintain their high engagement trend.`;

  if (isGeminiActive) {
    try {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7
        }
      };

      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeGeminiKey}`,
        payload,
        { timeout: 15000 }
      );

      const replyText = data.candidates?.[0]?.parts?.[0]?.text?.trim();
      if (replyText) {
        await cache.set(cacheKey, replyText, 3600 * 2); // cache for 2 hours
        return replyText;
      }
    } catch (err) {
      console.error('Gemini Insights generation error:', err.response?.data || err.message);
    }
  }

  // Fallback if not enabled or error
  return defaultInsights;
};

module.exports = { generateRecommendationExplanation, chatbotResponse, openaiEnabled, generateUserActivityInsights };
