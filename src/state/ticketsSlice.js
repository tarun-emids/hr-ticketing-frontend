// Ticket state: RTK entity adapter replacing the pub/sub module store.
// Every write thunk's fulfilled branch upserts the authoritative ticket the
// server returns (status bumps, closedBy, auto pickup replies) — the same
// contract the old updateCache gave callers.
import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import * as api from "../api/client";

const adapter = createEntityAdapter({
  sortComparer: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
});

const initialState = adapter.getInitialState({
  status: "idle", // idle | loading | succeeded | failed
  error: null,
});

export const fetchTickets = createAsyncThunk("tickets/fetchAll", () => api.listTickets());
export const fetchTicket = createAsyncThunk("tickets/fetchOne", (id) => api.getTicket(id));

export const createTicket = createAsyncThunk("tickets/create", (payload) =>
  api.createTicket(payload),
);
export const uploadAttachment = createAsyncThunk("tickets/uploadAttachment", ({ ticketId, file }) =>
  api.uploadAttachment(ticketId, file),
);
// role was only ever tolerated, never used — the server derives it from authorId
export const addReplyTicket = createAsyncThunk("tickets/addReply", ({ ticketId, authorId, text }) =>
  api.addReply(ticketId, { authorId, text }),
);
export const updateStatusTicket = createAsyncThunk(
  "tickets/updateStatus",
  ({ ticketId, status, actorId }) => api.updateStatus(ticketId, { status, actorId }),
);
export const assignTicketTicket = createAsyncThunk("tickets/assign", ({ ticketId, assigneeId }) =>
  api.assignTicket(ticketId, { assigneeId }),
);
// auto-assign returns routing metadata (routedTo) plus the ticket; cache only
// the ticket itself so entries keep the canonical shape.
export const autoAssignTicketTicket = createAsyncThunk("tickets/autoAssign", async (ticketId) => {
  const { routedTo, ...ticket } = await api.autoAssignTicket(ticketId);
  return ticket;
});
export const setPriorityTicket = createAsyncThunk("tickets/setPriority", ({ ticketId, priority }) =>
  api.setPriority(ticketId, { priority }),
);
export const setCategoryTicket = createAsyncThunk("tickets/setCategory", ({ ticketId, category }) =>
  api.setCategory(ticketId, { category }),
);
export const submitDraftTicket = createAsyncThunk("tickets/submitDraft", ({ draftId, payload }) =>
  api.submitDraft(draftId, payload),
);

const onTicketFulfilled = (state, action) => {
  adapter.upsertOne(state, action.payload);
};

const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTickets.pending, (state) => {
        // stale-while-revalidate: only show a spinner when nothing is cached;
        // otherwise keep displaying the cached list while the refetch runs
        if (state.ids.length === 0) state.status = "loading";
      })
      .addCase(fetchTickets.fulfilled, (state, action) => {
        adapter.setAll(state, action.payload);
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(fetchTickets.rejected, (state, action) => {
        if (state.ids.length === 0) {
          state.status = "failed";
          state.error = action.error?.message ?? "Failed to load tickets";
        }
      })
      .addCase(fetchTicket.fulfilled, onTicketFulfilled)
      .addCase(createTicket.fulfilled, onTicketFulfilled)
      .addCase(uploadAttachment.fulfilled, onTicketFulfilled)
      .addCase(addReplyTicket.fulfilled, onTicketFulfilled)
      .addCase(updateStatusTicket.fulfilled, onTicketFulfilled)
      .addCase(assignTicketTicket.fulfilled, onTicketFulfilled)
      .addCase(autoAssignTicketTicket.fulfilled, onTicketFulfilled)
      .addCase(setPriorityTicket.fulfilled, onTicketFulfilled)
      .addCase(setCategoryTicket.fulfilled, onTicketFulfilled)
      .addCase(submitDraftTicket.fulfilled, onTicketFulfilled);
  },
});

export default ticketsSlice.reducer;

export const { selectAll: selectAllTickets, selectById: selectTicketById } = adapter.getSelectors(
  (state) => state.tickets,
);

// Matches what useTickets rendered: a spinner until real data ever arrives
// (first load), then cached data while idle/refetching, and an empty state on
// hard failure when there was nothing cached.
export const selectTicketsLoading = createSelector(
  (state) => state.tickets.ids,
  (state) => state.tickets.status,
  (ids, status) => status === "idle" || (status === "loading" && ids.length === 0),
);
