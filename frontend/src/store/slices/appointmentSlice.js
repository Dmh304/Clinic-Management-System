import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { appointmentService } from '../../services/appointmentService'

export const fetchTodayAppointments = createAsyncThunk(
  'appointment/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      const res = await appointmentService.getTodayAppointments()
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải danh sách lịch hẹn')
    }
  }
)

export const changeAppointmentStatus = createAsyncThunk(
  'appointment/changeStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await appointmentService.updateStatus(id, status)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }
)

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayAppointments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTodayAppointments.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchTodayAppointments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(changeAppointmentStatus.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
  },
})

export default appointmentSlice.reducer
