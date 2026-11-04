// Notification state: list + unread badge. Mirrors the old notifications
// module contract — every write to the API is followed by an authoritative
// re-read so the badge and the list never disagree, and "newest first, already
// scoped to the acting user server-side" holds.
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import * as api from "../api/client";

const initialState = {
  items: [],
  unread: 0,
  status: "idle", // idle | loading | succeeded | failed
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  ({ userId, limit = 50 }) =>
    Promise.all([api.listNotifications({ userId, limit }), api.unreadCount(userId)]).then(
      ([items, count]) => ({ items, unread: count.unread }),
    ),
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async ({ id, userId }, thunkAPI) => {
    await api.markNotificationRead(id, userId);
    await thunkAPI.dispatch(fetchNotifications({ userId })).unwrap();
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async ({ userId }, thunkAPI) => {
    await api.markAllNotificationsRead(userId);
    await thunkAPI.dispatch(fetchNotifications({ userId })).unwrap();
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.unread = action.payload.unread;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message ?? "Failed to load notifications";
      })
      // signing out drops any user-scoped notifications from the store
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default notificationsSlice.reducer;

export const selectNotifications = (state) => state.notifications.items;
export const selectUnreadCount = (state) => state.notifications.unread;
