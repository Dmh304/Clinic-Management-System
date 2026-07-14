import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { invoiceService } from '../../services/invoiceService'

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