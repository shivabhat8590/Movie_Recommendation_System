/**
 * Checks if a movie is appropriate for Kids Mode.
 * It filters out:
 * - Movies explicitly marked as adult (R-rated, adult = true).
 * - Movies of mature genres (Horror, Thriller, Crime).
 * - Movies that do not belong to kid-friendly genres (Animation, Family).
 * 
 * Supports both raw TMDB format (genre_ids) and local database/enriched format (genres array of objects or strings).
 */
export const isMovieKidFriendly = (m) => {
  if (!m) return false;

  // 1. Check if explicitly marked adult
  if (m.adult) return false;

  // 2. Check genre_ids (standard TMDB search results format)
  if (m.genre_ids && Array.isArray(m.genre_ids)) {
    // TMDB genre IDs:
    // 16 is Animation
    // 10751 is Family
    // 27 is Horror
    // 53 is Thriller
    // 80 is Crime
    const hasKidsGenre = m.genre_ids.includes(16) || m.genre_ids.includes(10751);
    const hasAdultGenre = m.genre_ids.includes(27) || m.genre_ids.includes(53) || m.genre_ids.includes(80);
    return hasKidsGenre && !hasAdultGenre;
  }

  // 3. Check genres as array of objects or strings (local DB/mock/wishlist format)
  if (m.genres && Array.isArray(m.genres)) {
    const genresList = m.genres.map(g => (typeof g === 'string' ? g : g.name || g)).filter(Boolean);
    const hasKidsGenre = genresList.some(g => ['Animation', 'Family'].includes(g));
    const hasAdultGenre = genresList.some(g => ['Horror', 'Thriller', 'Crime'].includes(g));
    return hasKidsGenre && !hasAdultGenre;
  }

  return false;
};
