// Le Thi Bich Ngan - HE204710
// Redux slice quản lý state lịch hẹn cho trang Reception Dashboard.
// Chứa các async thunk: tải danh sách lịch hôm nay, lấy thống kê dashboard,
// xác nhận lịch hẹn, check-in bệnh nhân, và cập nhật trạng thái lịch hẹn.

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { appointmentService } from '../../services/appointmentService'

// Tải danh sách lịch hẹn trong ngày hôm nay từ API để hiển thị lên bảng dashboard
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

// Cập nhật trạng thái lịch hẹn (dùng cho: WAITING→IN_PROGRESS khi bắt đầu khám, hoặc hủy lịch)
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

// Xác nhận lịch hẹn PENDING, có thể kèm gán bác sĩ phụ trách (doctorId tùy chọn)
export const confirmAppointment = createAsyncThunk(
  'appointment/confirm',
  async ({ id, doctorId }, { rejectWithValue }) => {
    try {
      const res = await appointmentService.confirmAppointment(id, doctorId)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể xác nhận lịch hẹn')
    }
  }
)

// Check-in bệnh nhân đã xác nhận: chuyển trạng thái sang WAITING và tạo số thứ tự hàng đợi
export const checkInAppointment = createAsyncThunk(
  'appointment/checkIn',
  async (id, { rejectWithValue }) => {
    try {
      const res = await appointmentService.checkInAppointment(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể check-in lịch hẹn')
    }
  }
)

// Tải thống kê lịch hẹn theo từng trạng thái để hiển thị các card số liệu trên dashboard
export const fetchDashboard = createAsyncThunk(
  'appointment/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await appointmentService.getDashboard()
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải thống kê')
    }
  }
)

// Slice quản lý state: list (danh sách lịch hẹn), dashboard (thống kê), loading, error.
// extraReducers cập nhật state tương ứng khi mỗi async thunk fulfilled/rejected.
const appointmentSlice = createSlice({
  name: 'appointment',
  initialState: {
    list: [],
    dashboard: null,
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
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboard = action.payload
      })
      .addCase(changeAppointmentStatus.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
      .addCase(confirmAppointment.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
      .addCase(checkInAppointment.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
  },
})

export default appointmentSlice.reducer
