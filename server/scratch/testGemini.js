const axios = require('axios');

async function test() {
  const activeGeminiKey = 'AIzaSyCuBBe9jzZPLqbVkxbMA_h7uIhq7glMiqo';
  const systemPrompt = `You are KidsAI, a super fun, friendly, playful, and magical AI assistant for a kids' movie recommendation website! 🧸🎈
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

  const messages = [
    { role: 'user', content: 'Recommend happy funny cartoons and animation' }
  ];

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

  try {
    const { data } = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeGeminiKey}`,
      payload
    );

    console.log('STATUS:', data.candidates?.[0]?.finishReason);
    console.log('TEXT:', data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err) {
    console.error('ERROR:', err.response?.data || err.message);
  }
}

test();
