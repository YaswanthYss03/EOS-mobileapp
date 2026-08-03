import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services';
import { ERROR_MESSAGES } from '../../constants/config';

// Async thunks for API calls
export const signup = createAsyncThunk(
  'auth/signup',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      console.log('🔐 Redux signup thunk called with:', { username, password: password ? 'PROVIDED' : 'NOT PROVIDED' });
      const response = await authAPI.signup({ username, password });
      console.log('✅ Signup API response:', response);
      return response;
    } catch (error) {
      console.error('❌ Signup thunk error:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.NETWORK_ERROR);
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login({ username, password });
      return response;
    } catch (error) {
      return rejectWithValue(error.message || ERROR_MESSAGES.NETWORK_ERROR);
    }
  }
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔍 Attempting to restore session...');

      const response = await authAPI.getCurrentSession();
      if (response.success && response.data) {
        console.log('✅ Traditional session restored');
        return response.data;
      }

      console.log('ℹ️ No active session found');
      return rejectWithValue('No active session');

    } catch (error) {
      console.error('❌ Session restoration error:', error);
      return rejectWithValue(error.message || ERROR_MESSAGES.NETWORK_ERROR);
    }
  }
);

export const refreshUserData = createAsyncThunk(
  'auth/refreshUserData',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { user } = getState().auth;
      if (!user || !user.user_id) {
        return rejectWithValue('No user logged in');
      }
      
      const response = await authAPI.getCurrentSession();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue('Failed to refresh user data');
      }
    } catch (error) {
      return rejectWithValue(error.message || ERROR_MESSAGES.NETWORK_ERROR);
    }
  }
);

export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;
      
      // Call logout API
      const response = await authAPI.logout(token);
      
      // Clear persisted auth data
      await AsyncStorage.removeItem('persist:auth');
      await AsyncStorage.removeItem('persist:root');
      
      return response;
    } catch (error) {
      // Still clear persisted data even if API call fails
      try {
        await AsyncStorage.removeItem('persist:auth');
        await AsyncStorage.removeItem('persist:root');
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
      
      return rejectWithValue(error.message || ERROR_MESSAGES.NETWORK_ERROR);
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.error = null;
      state.loading = false;
      
      // Clear persisted storage
      AsyncStorage.removeItem('persist:auth').catch(console.error);
      AsyncStorage.removeItem('persist:root').catch(console.error);
    },
  },
  extraReducers: (builder) => {
    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Restore Session
    builder
      .addCase(restoreSession.pending, (state) => {
        console.log('🔍 Session restoration in progress...');
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        console.log('🔄 Session restoration successful');
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state) => {
        console.log('⚠️ Session restoration failed');
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.error = null;
      });

    // Refresh User Data
    builder
      .addCase(refreshUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(refreshUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = null;
        state.loading = false;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.token = null;
        state.error = null;
        state.loading = false;
      });
  },
});

export const { clearError, logout } = authSlice.actions;
export default authSlice.reducer;
