// Auth state, replacing src/context/AuthContext.jsx as a plain slice.
// Session lives in `user`, hydrated from localStorage (key `hrdesk.user`)
// and persisted by the login/logout thunks.
//
// Sessions created before real login went live carry no `via` marker —
// treat them as mock leftovers and require a fresh sign-in.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as api from "../api/client";

const STORAGE_KEY = "hrdesk.user";

function readStoredUser() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.via === "password" ? parsed : null;
  } catch {
    return null;
  }
}

export const fetchUsers = createAsyncThunk("auth/fetchUsers", () => api.listUsers());

export const login = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.login(email, password);
      const sessionUser = { ...res.user, via: "password" };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    } catch (err) {
      return rejectWithValue(err?.message ?? String(err));
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem(STORAGE_KEY);
  return null;
});

// Lazy: read localStorage when each store instance initializes its auth
// slice, not at module import — so tests can seed a session before makeStore().
const makeInitialState = () => ({
  user: readStoredUser(),
  users: [],
  usersReady: false,
  loginStatus: "idle", // idle | loading | succeeded | failed
  loginError: null,
});

const authSlice = createSlice({
  name: "auth",
  initialState: makeInitialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.usersReady = true;
        // Drop a stored session whose id no longer exists (deprovisioned)
        const list = action.payload ?? [];
        if (state.user && !list.some((u) => u.id === state.user.id)) state.user = null;
      })
      // Backend unreachable — keep any stored session so the UI stays usable
      .addCase(fetchUsers.rejected, (state) => {
        state.usersReady = true;
      })
      .addCase(login.pending, (state) => {
        state.loginStatus = "loading";
        state.loginError = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loginStatus = "succeeded";
        state.loginError = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loginStatus = "failed";
        state.loginError = action.payload ?? action.error?.message ?? "Sign-in failed";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export default authSlice.reducer;

export const selectUser = (state) => state.auth.user;
export const selectUsers = (state) => state.auth.users;
export const selectUsersReady = (state) => state.auth.usersReady;
export const selectLoginStatus = (state) => state.auth.loginStatus;
export const selectIsAgent = (state) => state.auth.user?.role === "agent";
