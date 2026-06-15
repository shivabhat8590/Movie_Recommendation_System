import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const loginUser = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', creds);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', body);
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data.data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {
    logout(state) {
      state.user = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    const handle = (thunk) => {
      builder
        .addCase(thunk.pending, (s) => { s.loading = true; s.error = null; })
        .addCase(thunk.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; s.initialized = true; })
        .addCase(thunk.rejected, (s, a) => { s.loading = false; s.error = a.payload; s.initialized = true; });
    };
    handle(loginUser);
    handle(registerUser);
    handle(fetchMe);
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
