import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import ticketsReducer from "./ticketsSlice";
import notificationsReducer from "./notificationsSlice";

// makeStore exists for tests (NotificationBell.test.jsx) that need an isolated
// store; the app ships the singleton below.
export const makeStore = (preloadedState) =>
  configureStore({
    reducer: {
      auth: authReducer,
      tickets: ticketsReducer,
      notifications: notificationsReducer,
    },
    preloadedState,
  });

export const store = makeStore();
