/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-06-22
 * @updated     2026-07-02
 *
 * Redux slice for the Receptionist billing screen — UC-23 (Process Payment)
 * and UC-24 (Deliver Invoice).
 *
 * Every thunk mirrors a backend endpoint and converts a rejected request into
 * a user-facing message. No business rule is evaluated here: BR-10, BR-11 and
 * BR-09 all live server-side, and a violation arrives as a rejected action.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { invoiceService } from '../../services/invoiceService'

/**
 * Loads every invoice into `state.list`.
 * @returns {Promise} fulfilled with the invoice array
 */
export const fetchAllInvoices = createAsyncThunk(
  'invoice/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await invoiceService.getAll()
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải danh sách hóa đơn')
    }
  }
)

/**
 * Replaces `state.list` with search results.
 * @param {string} keyword patient name, phone or invoice code
 */
export const searchInvoices = createAsyncThunk(
  'invoice/search',
  async (keyword, { rejectWithValue }) => {
    try {
      const res = await invoiceService.search(keyword)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Tìm kiếm thất bại')
    }
  }
)

/**
 * Creates a DRAFT invoice and prepends it to the list.
 * @param {Object} data charge lines, optional discount, payment method
 *
 * Validate: BR-11 / BR-15 and the duplicate-invoice check (UC-23 E1) run on
 * the server; a rejection here carries that message straight to the UI.
 */
export const createInvoice = createAsyncThunk(
  'invoice/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await invoiceService.create(data)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tạo hóa đơn')
    }
  }
)

/**
 * Issues an invoice after payment and swaps the updated row into the list.
 * @param {{id:number, paymentMethod:string, paymentReference?:string}} args
 *
 * Validate: BR-10 — the server refuses to issue a VietQR invoice that is
 * still awaiting the bank, so the rejection message is the guard the UI shows.
 */
export const issueInvoice = createAsyncThunk(
  'invoice/issue',
  async ({ id, paymentMethod, paymentReference }, { rejectWithValue }) => {
    try {
      const res = await invoiceService.issue(id, paymentMethod, paymentReference)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể phát hành hóa đơn')
    }
  }
)

/**
 * Cancels a draft invoice and swaps the updated row into the list.
 * @param {number} id invoice id
 *
 * Validate: BR-09 — a soft cancel, so the row stays in `state.list` with
 * status CANCELLED instead of being removed.
 */
export const cancelInvoice = createAsyncThunk(
  'invoice/cancel',
  async (id, { rejectWithValue }) => {
    try {
      const res = await invoiceService.cancel(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể hủy hóa đơn')
    }
  }
)

const invoiceSlice = createSlice({
  name: 'invoice',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllInvoices.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAllInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchAllInvoices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(searchInvoices.pending, (state) => {
        state.loading = true
      })
      .addCase(searchInvoices.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(searchInvoices.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      .addCase(createInvoice.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
      })

      .addCase(issueInvoice.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.list.findIndex((i) => i.id === updated.id)
        if (idx !== -1) state.list[idx] = updated
      })

      .addCase(cancelInvoice.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.list.findIndex((i) => i.id === updated.id)
        if (idx !== -1) state.list[idx] = updated
      })
  },
})

export default invoiceSlice.reducer