import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchTrending = createAsyncThunk('movies/trending', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/movies/trending');
    return data.data.movies;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const searchMovies = createAsyncThunk('movies/search', async ({ q, page = 1 }, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/movies/search', { params: { q, page } });
    return { movies: data.data.movies, query: q, page };
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchMovieDetail = createAsyncThunk('movies/detail', async (tmdbId, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/movies/${tmdbId}`);
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchGenres = createAsyncThunk('movies/genres', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/movies/genres');
    return data.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const moviesSlice = createSlice({
  name: 'movies',
  initialState: {
    trending: [], genres: [], searchResults: [], searchQuery: '',
    selectedMovie: null, loading: false, searchLoading: false, error: null,
    kidsMode: localStorage.getItem('kidsMode') === 'true',
  },
  reducers: {
    clearSearch(state) { state.searchResults = []; state.searchQuery = ''; },
    clearSelectedMovie(state) { state.selectedMovie = null; },
    toggleKidsMode(state) {
      state.kidsMode = !state.kidsMode;
      localStorage.setItem('kidsMode', state.kidsMode ? 'true' : 'false');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrending.pending, (s) => { s.loading = true; })
      .addCase(fetchTrending.fulfilled, (s, a) => { s.loading = false; s.trending = a.payload; })
      .addCase(fetchTrending.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(searchMovies.pending, (s) => { s.searchLoading = true; })
      .addCase(searchMovies.fulfilled, (s, a) => { 
        s.searchLoading = false; 
        s.searchResults = a.payload.movies || []; 
        s.searchQuery = a.payload.query; 
      })
      .addCase(searchMovies.rejected, (s) => { s.searchLoading = false; })
      .addCase(fetchMovieDetail.pending, (s) => { s.loading = true; })
      .addCase(fetchMovieDetail.fulfilled, (s, a) => { s.loading = false; s.selectedMovie = a.payload; })
      .addCase(fetchMovieDetail.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchGenres.fulfilled, (s, a) => { s.genres = a.payload; });
  },
});

export const { clearSearch, clearSelectedMovie, toggleKidsMode } = moviesSlice.actions;
export default moviesSlice.reducer;
